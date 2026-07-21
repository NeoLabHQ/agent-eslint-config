import antfu from "@antfu/eslint-config";
import sonarjs from "eslint-plugin-sonarjs";
import path from "node:path";
import { AST_NODE_TYPES, ESLintUtils, TSESLint } from "@typescript-eslint/utils";
import validateFilename from "eslint-plugin-validate-filename";
import promisePlugin from "eslint-plugin-promise";
import tseslint from "typescript-eslint";
import * as ts from "typescript";
//#region src/configs/complexity.ts
/**
* Complexity-threshold rule group: ESLint-core cyclomatic/size limits plus
* SonarJS cognitive-complexity (its natural companion).
*
* Ownership (exclusive) — transcribed from `src/eslint.config.mjs` lines 40-46
* (core thresholds) and line 162 (`sonarjs/cognitive-complexity`). This builder,
* NOT `sonarjs.ts`, owns cognitive-complexity so both complexity dimensions
* (cyclomatic + cognitive) live together.
*
* antfu does NOT bundle `eslint-plugin-sonarjs`, so the plugin is registered here
* (safe to re-register the same reference across sibling builders).
*
* @param _options - Resolved factory options (unused: this group is static).
* @returns The complexity-threshold flat-config items.
*/
function complexityConfig(_options) {
	return [{
		plugins: { sonarjs },
		rules: {
			"complexity": ["error", 10],
			"max-depth": ["error", 2],
			"max-lines-per-function": ["error", {
				max: 40,
				skipBlankLines: true,
				skipComments: true
			}],
			"max-statements": ["error", 10],
			"max-lines": ["error", {
				max: 150,
				skipBlankLines: true,
				skipComments: true
			}],
			"max-nested-callbacks": ["error", 3],
			"max-params": ["error", 3],
			"sonarjs/cognitive-complexity": ["error", 4]
		}
	}];
}
//#endregion
//#region src/types.ts
/**
* Default alias settings applied when a consumer passes no `alias` option (or
* omits one of its fields): the `@` prefix mapped to the `src` directory.
*/
const DEFAULT_ALIAS = {
	prefix: "@",
	sourceDir: "src"
};
//#endregion
//#region src/plugins/root-alias.ts
const createRule$1 = ESLintUtils.RuleCreator((name) => `https://github.com/NeoLabHQ/agent-eslint-config/blob/main/docs/rules/${name}.md`);
/**
* Returns true for a same-directory import of at most two path parts (`./foo`),
* which the original rule intentionally allows to stay relative.
*
* @param importPath - the raw import specifier (e.g. `./foo`, `../a/b`)
*/
function isAllowedSameDirImport(importPath) {
	const pathParts = importPath.split("/");
	return pathParts[0] === "." && pathParts.length <= 2;
}
/**
* Resolves an import specifier to its path relative to the project root, split
* into segments. Returns `null` when the specifier is not a relative import.
*
* @param importPath - the raw import specifier
* @param filename - the absolute-or-relative path of the importing file
* @param cwd - the project root the resulting path is made relative to
*/
function resolveImportSegments(importPath, filename, cwd) {
	const currentFileDirectory = path.dirname(filename);
	const importFilePath = path.resolve(currentFileDirectory, importPath);
	return path.relative(cwd, importFilePath).split(path.sep);
}
var root_alias_default = {
	meta: {
		name: "eslint-plugin-root-alias",
		version: "1.0.0"
	},
	rules: { "prefer-alias": createRule$1({
		name: "prefer-alias",
		meta: {
			type: "suggestion",
			fixable: "code",
			docs: { description: "Prefer the source-root alias over relative imports that reach into the source directory." },
			messages: { default: "Use alias \"{{alias}}\" instead of relative import \"{{relative}}\"" },
			schema: [{
				type: "object",
				properties: {
					prefix: { type: "string" },
					sourceDir: { type: "string" }
				},
				additionalProperties: false
			}]
		},
		defaultOptions: [DEFAULT_ALIAS],
		create(context, [options]) {
			const prefix = options.prefix ?? DEFAULT_ALIAS.prefix;
			const sourceDir = options.sourceDir ?? DEFAULT_ALIAS.sourceDir;
			return { ImportDeclaration(node) {
				const importPath = node.source.value;
				if (importPath.indexOf(".") !== 0) return;
				if (isAllowedSameDirImport(importPath)) return;
				const importFilePathParts = resolveImportSegments(importPath, context.filename, context.cwd);
				if (importFilePathParts.shift() !== sourceDir) return;
				const aliasedImport = [prefix, ...importFilePathParts].join("/");
				context.report({
					node: node.source,
					messageId: "default",
					data: {
						alias: aliasedImport,
						relative: importPath
					},
					fix: (fixer) => fixer.replaceText(node.source, `'${aliasedImport}'`)
				});
			} };
		}
	}) }
};
const plugin = {
	meta: {
		name: "eslint-plugin-step-down-rule",
		version: "1.0.0"
	},
	rules: { "step-down": ESLintUtils.RuleCreator((name) => `https://github.com/NeoLabHQ/agent-eslint-config/blob/main/docs/rules/${name}.md`)({
		name: "step-down",
		meta: {
			type: "suggestion",
			docs: { description: "Enforce top-down call structure — callers appear before callees." },
			messages: { stepDown: "Expected '{{callee}}' to be defined after '{{caller}}'. Follow top-to-bottom definitions" },
			schema: []
		},
		defaultOptions: [],
		create(context) {
			const sourceCode = context.sourceCode;
			let requiredFunctions = [];
			let methodStack = [];
			return {
				Program(node) {
					methodStack = [];
					requiredFunctions = [];
					findVariablesInScope(sourceCode.getScope(node));
				},
				MethodDefinition(node) {
					if (node.kind === "method") methodStack.push("name" in node.key ? node.key.name : void 0);
				},
				"CallExpression:exit"(node) {
					if (node.callee.type !== AST_NODE_TYPES.MemberExpression || node.callee.property.type !== AST_NODE_TYPES.Identifier) return;
					if (node.callee.object.type !== AST_NODE_TYPES.ThisExpression) return;
					const calledMethodName = node.callee.property.name;
					const calledIndex = methodStack.indexOf(calledMethodName);
					if (calledIndex === -1 || calledIndex >= methodStack.length - 1) return;
					const callerName = methodStack[methodStack.length - 1] ?? "(unknown)";
					context.report({
						node,
						messageId: "stepDown",
						data: {
							callee: calledMethodName,
							caller: callerName
						}
					});
				}
			};
			function findVariablesInScope(scope) {
				for (const reference of scope.references) {
					const variable = reference.resolved;
					collectRequiredFunction(reference);
					if (!isViolation(reference, variable)) continue;
					context.report({
						node: reference.identifier,
						messageId: "stepDown",
						data: {
							callee: reference.identifier.name,
							caller: resolveCallerName(reference)
						}
					});
				}
				for (const childScope of scope.childScopes) findVariablesInScope(childScope);
			}
			function collectRequiredFunction(reference) {
				const grandParent = reference.identifier.parent?.parent;
				if (reference.identifier.name === "require" && grandParent?.type === AST_NODE_TYPES.VariableDeclarator && grandParent.id.type === AST_NODE_TYPES.Identifier) requiredFunctions.push(grandParent.id.name);
			}
			function isViolation(reference, variable) {
				if (reference.init || !variable || variable.identifiers.length === 0) return false;
				if (isInsideDecorator(reference)) return false;
				if (isNotAFunctionCall(reference)) return false;
				if (isCallingDown(variable, reference) && !isSameScope(variable, reference)) return false;
				if (isSameScope(variable, reference) && !isCallingDown(variable, reference)) return false;
				if (requiredFunctions.includes(reference.identifier.name)) return false;
				if (isNotADeclaration(variable)) return false;
				if (isRecursiveFunction(reference.identifier, reference.identifier.name)) return false;
				if (!isOuterVariable(variable, reference) && !isFunctionDef(variable)) return false;
				return true;
			}
			function isInsideDecorator(reference) {
				let node = reference.identifier.parent;
				while (node) {
					if (node.type === AST_NODE_TYPES.Decorator) return true;
					node = node.parent;
				}
				return false;
			}
			function isNotAFunctionCall(reference) {
				const parent = reference.identifier.parent;
				return parent.type !== AST_NODE_TYPES.CallExpression || parent.callee.type !== AST_NODE_TYPES.Identifier || reference.identifier.name !== parent.callee.name;
			}
			function isCallingDown(variable, reference) {
				return variable.identifiers[0].range[1] > reference.identifier.range[1];
			}
			function isSameScope(variable, reference) {
				return variable.scope.variableScope === reference.from.variableScope;
			}
			function isNotADeclaration(variable) {
				const { type } = variable.identifiers[0].parent;
				return type !== AST_NODE_TYPES.VariableDeclarator && type !== AST_NODE_TYPES.FunctionDeclaration;
			}
			function isRecursiveFunction(identifier, funcName) {
				const parent = identifier.parent;
				if (!parent) return false;
				if ("id" in parent && parent.id && "name" in parent.id && parent.id.name === funcName) return true;
				return isRecursiveFunction(parent, funcName);
			}
			function isOuterVariable(variable, reference) {
				return variable.defs[0].type === TSESLint.Scope.DefinitionType.Variable && variable.scope.variableScope !== reference.from.variableScope;
			}
			function isFunctionDef(variable) {
				return variable.defs[0].type === TSESLint.Scope.DefinitionType.FunctionName;
			}
			function resolveCallerName(reference) {
				let scope = reference.from;
				while (scope) {
					const name = nameFromScope(scope);
					if (name) return name;
					scope = scope.upper;
				}
				return "(unknown)";
			}
			function nameFromScope(scope) {
				const block = scope.block;
				if ("id" in block && block.id && "name" in block.id) return block.id.name;
				const parent = block.parent;
				if (parent?.type === AST_NODE_TYPES.VariableDeclarator && parent.id.type === AST_NODE_TYPES.Identifier) return parent.id.name;
				if (parent?.type === AST_NODE_TYPES.Property && parent.key.type === AST_NODE_TYPES.Identifier) return parent.key.name;
				if (parent?.type === AST_NODE_TYPES.MethodDefinition && parent.key.type === AST_NODE_TYPES.Identifier) return parent.key.name;
				return null;
			}
		}
	}) }
};
//#endregion
//#region src/configs/custom.ts
/**
* Custom-plugin rule group: wires the two AST-only custom rules — `step-down`
* (always on) and `prefer-alias` (gated on the `alias` option).
*
* Ownership (exclusive) — transcribed from `src/eslint.config.mjs` lines 12-19
* (`alias` plugin + `prefer-alias` rule) and line 37 (`step-down`). The
* type-aware `no-never-return` rule is owned by `type-aware.ts`, not here.
*
* antfu bundles neither plugin, so both are registered by this builder.
*
* The `alias` gating is the only place the bespoke `alias` option changes the
* emitted rule set: when disabled (`alias: false`) the `prefer-alias` rule and
* its plugin are omitted entirely; otherwise the resolved `{ prefix, sourceDir }`
* are fed straight into the rule's options so its reports and autofix use them.
*
* @param options - Resolved factory options; `options.alias` gates `prefer-alias`.
* @returns The custom-plugin flat-config items.
*/
function customConfig(options) {
	const items = [{
		plugins: { "step-down-rule": plugin },
		rules: { "step-down-rule/step-down": "error" }
	}];
	if (options.alias !== false) items.push({
		plugins: { alias: root_alias_default },
		rules: { "alias/prefer-alias": ["error", {
			prefix: options.alias.prefix,
			sourceDir: options.alias.sourceDir
		}] }
	});
	return items;
}
//#endregion
//#region src/configs/jsdoc.ts
/**
* JSDoc documentation-enforcement rule group.
*
* Ownership (exclusive) — transcribed from `src/eslint.config.mjs` lines 71-90.
*
* antfu already bundles and registers `eslint-plugin-jsdoc`, so this builder
* only overrides rule severities; it does NOT re-register the plugin.
*
* @param _options - Resolved factory options (unused: this group is static).
* @returns The JSDoc flat-config items.
*/
function jsdocConfig(_options) {
	return [{ rules: {
		"jsdoc/require-jsdoc": ["error", {
			require: {
				FunctionDeclaration: true,
				MethodDefinition: true,
				ClassDeclaration: true,
				ArrowFunctionExpression: false,
				FunctionExpression: false
			},
			checkConstructors: true,
			checkGetters: true,
			checkSetters: true
		}],
		"jsdoc/require-description": "error",
		"jsdoc/require-param": "error",
		"jsdoc/require-returns": "error",
		"jsdoc/check-param-names": "error",
		"jsdoc/no-blank-blocks": "error"
	} }];
}
//#endregion
//#region src/configs/naming.ts
/**
* Naming-convention rule group: bans vague identifier/file names
* (`util`/`common`/`helper`/`function`) and disables antfu's lowercase-title rule.
*
* Ownership (exclusive) — transcribed from `src/eslint.config.mjs` lines 22-33
* (validate-filename + test override) and lines 130-155 (sonar naming rules).
* The three sonar naming rules live here, NOT in `sonarjs.ts`.
*
* antfu bundles neither `eslint-plugin-sonarjs` nor `eslint-plugin-validate-filename`,
* so both are registered here; `test/prefer-lowercase-title` overrides antfu's
* already-registered `test` plugin default.
*
* @param _options - Resolved factory options (unused: this group is static).
* @returns The naming-convention flat-config items.
*/
function namingConfig(_options) {
	return [{
		plugins: {
			"sonarjs": sonarjs,
			"validate-filename": validateFilename
		},
		rules: {
			"validate-filename/naming-rules": ["error", { rules: [{
				target: "**/*.ts",
				patterns: "^(?!.*(util|common|helper|function)).+$"
			}] }],
			"test/prefer-lowercase-title": "off",
			"sonarjs/class-name": ["error", { format: "^(?!.*(util|Util|UTIL|common|Common|COMMON|helper|Helper|HELPER|function|Function|FUNCTION))[A-Z][a-zA-Z0-9]*$" }],
			"sonarjs/function-name": ["error", { format: "^(?!.*(util|Util|UTIL|common|Common|COMMON|helper|Helper|HELPER|function|Function|FUNCTION))[a-zA-Z][a-zA-Z0-9]*$" }],
			"sonarjs/variable-name": ["error", { format: "^(?!.*(util|Util|UTIL|common|Common|COMMON|helper|Helper|HELPER|function|Function|FUNCTION))([a-z][a-zA-Z0-9]*|[A-Z][A-Z0-9_]*|[A-Z][a-zA-Z0-9]*|_{1,5})$" }]
		}
	}];
}
//#endregion
//#region src/configs/promise.ts
/**
* Promise rule group: enforces `await` over `.then()` chaining.
*
* Ownership (exclusive) — transcribed from `src/eslint.config.mjs` line 5 (plugin
* import/registration) and line 35 (`promise/prefer-await-to-then`).
*
* antfu does NOT bundle `eslint-plugin-promise`, so this builder registers the
* plugin itself; omitting it would silently drop the rule.
*
* @param _options - Resolved factory options (unused: this group is static).
* @returns The promise flat-config items.
*/
function promiseConfig(_options) {
	return [{
		plugins: { promise: promisePlugin },
		rules: { "promise/prefer-await-to-then": "error" }
	}];
}
//#endregion
//#region src/configs/sonarjs.ts
/**
* SonarJS rule group: control-flow, dead-code, nesting, loops, functions,
* promises, security, and testing rules.
*
* Ownership (exclusive) — transcribed from `src/eslint.config.mjs` lines 163-225.
* Deliberately EXCLUDES the two sonar rule sets owned by sibling builders:
*   - the 3 naming rules (`class-name`/`function-name`/`variable-name`, lines
*     130-155) → owned by `naming.ts`
*   - `sonarjs/cognitive-complexity` (line 162) → owned by `complexity.ts`
*
* antfu does NOT bundle `eslint-plugin-sonarjs`, so this builder registers the
* plugin. Registering it here (and again in `naming.ts`/`complexity.ts`) is safe:
* flat config shallow-merges identical plugin references without conflict.
*
* @param _options - Resolved factory options (unused: this group is static).
* @returns The SonarJS flat-config items.
*/
function sonarjsConfig(_options) {
	return [{
		plugins: { sonarjs },
		rules: {
			"sonarjs/nested-control-flow": ["error", { maximumNestingLevel: 2 }],
			"sonarjs/too-many-break-or-continue-in-loop": "error",
			"sonarjs/elseif-without-else": "error",
			"sonarjs/no-nested-conditional": "error",
			"sonarjs/no-same-line-conditional": "error",
			"sonarjs/conditional-indentation": "error",
			"sonarjs/no-all-duplicated-branches": "error",
			"sonarjs/no-duplicated-branches": "error",
			"sonarjs/no-dead-store": "error",
			"sonarjs/no-redundant-assignments": "error",
			"sonarjs/no-identical-functions": ["error", 3],
			"sonarjs/no-useless-catch": "error",
			"sonarjs/no-useless-increment": "error",
			"sonarjs/useless-string-operation": "error",
			"sonarjs/prefer-immediate-return": "error",
			"sonarjs/no-nested-assignment": "error",
			"sonarjs/no-nested-functions": "error",
			"sonarjs/no-nested-incdec": "error",
			"sonarjs/no-parameter-reassignment": "error",
			"sonarjs/destructuring-assignment-syntax": "error",
			"sonarjs/misplaced-loop-counter": "error",
			"sonarjs/updated-loop-counter": "error",
			"sonarjs/no-function-declaration-in-block": "error",
			"sonarjs/no-globals-shadowing": "error",
			"sonarjs/no-fallthrough": "error",
			"sonarjs/no-reference-error": "error",
			"sonarjs/no-unthrown-error": "error",
			"sonarjs/prefer-type-guard": "error",
			"sonarjs/no-try-promise": "error",
			"sonarjs/no-hardcoded-ip": "error",
			"sonarjs/no-hardcoded-passwords": "error",
			"sonarjs/no-hardcoded-secrets": "error",
			"sonarjs/os-command": "error",
			"sonarjs/no-skipped-tests": "error",
			"sonarjs/stable-tests": "error"
		}
	}];
}
//#endregion
//#region src/configs/stylistic.ts
/**
* Stylistic / code-shape rule group: ESLint-core formatting and declaration
* rules, static-member bans, and select `@typescript-eslint`/`perfectionist`
* overrides.
*
* Ownership (exclusive) — transcribed from `src/eslint.config.mjs` lines 34, 36,
* 114, 119-123, and 230-281.
*
* All referenced plugins (`ts`/`@typescript-eslint`, `perfectionist`) are already
* registered by antfu, so this builder only overrides rule severities/options.
*
* @param _options - Resolved factory options (unused: this group is static).
* @returns The stylistic flat-config items.
*/
function stylisticConfig(_options) {
	return [{ rules: {
		"ts/consistent-type-imports": "off",
		"perfectionist/sort-named-imports": "off",
		"@typescript-eslint/consistent-type-definitions": ["error", "interface"],
		"class-methods-use-this": "off",
		"@typescript-eslint/class-methods-use-this": ["error", {
			ignoreOverrideMethods: true,
			ignoreClassesThatImplementAnInterface: "public-fields"
		}],
		"no-warning-comments": ["error", {
			terms: ["jscpd:ignore-start", "jscpd:ignore-end"],
			location: "anywhere"
		}],
		"prefer-const": "error",
		"init-declarations": ["error", "always"],
		"id-length": ["error", {
			min: 3,
			max: 35,
			exceptions: [
				"i",
				"j",
				"k",
				"x",
				"y",
				"z",
				"_",
				"id",
				"on",
				"in",
				"of"
			]
		}],
		"padding-line-between-statements": [
			"error",
			{
				blankLine: "always",
				prev: ["const", "let"],
				next: "*"
			},
			{
				blankLine: "any",
				prev: ["const", "let"],
				next: ["const", "let"]
			},
			{
				blankLine: "always",
				prev: "*",
				next: "return"
			},
			{
				blankLine: "always",
				prev: "*",
				next: [
					"if",
					"for",
					"while",
					"switch",
					"try"
				]
			},
			{
				blankLine: "any",
				prev: ["const", "let"],
				next: "if"
			},
			{
				blankLine: "always",
				prev: [
					"if",
					"for",
					"while",
					"switch",
					"try"
				],
				next: "*"
			}
		],
		"preserve-caught-error": "error",
		"no-restricted-syntax": [
			"error",
			{
				selector: "MethodDefinition[static=true]",
				message: "Do not use static methods. Convert to an instance method or extract to a standalone function."
			},
			{
				selector: "PropertyDefinition[static=true]",
				message: "Do not use static properties. Use instance properties instead."
			}
		]
	} }];
}
var no_never_return_type_default = {
	meta: {
		name: "eslint-plugin-no-never-return-type",
		version: "1.0.0"
	},
	rules: { "no-never-return-type": ESLintUtils.RuleCreator((name) => `https://github.com/NeoLabHQ/agent-eslint-config/blob/main/docs/eslint-rules/${name}`)({
		name: "no-never-return-type",
		meta: {
			type: "problem",
			docs: { description: "Disallow functions that return `never`. Restructure to throw at the call site." },
			messages: { noNeverReturn: "Function has return type `never`. Throw directly at the call site instead of wrapping error in a function or throwing as side effect during validation." },
			schema: []
		},
		defaultOptions: [],
		create(context) {
			const services = ESLintUtils.getParserServices(context);
			const checker = services.program.getTypeChecker();
			/**
			* Returns true if the given function-like node resolves to a `never`
			* return type in the TypeScript type checker.
			*
			* @param functionNode - ESTree function-like node (declaration, expression, or arrow)
			* @returns whether the function's return type is `never`
			*/
			function hasNeverReturnType(functionNode) {
				const tsNode = services.esTreeNodeToTSNodeMap.get(functionNode);
				const signature = checker.getSignatureFromDeclaration(tsNode);
				if (!signature) return false;
				const returnType = checker.getReturnTypeOfSignature(signature);
				return Boolean(returnType.getFlags() & ts.TypeFlags.Never);
			}
			/**
			* Returns true when the function node is used as a callback — either as
			* an object property value or as an argument in a function/method call.
			* These are intentional throw-only callbacks (e.g. Catch decorator handlers)
			* and should not be flagged.
			*
			* @param node - ESTree function-like node to inspect
			* @returns whether the function is a callback
			*/
			function isCallbackFunction(node) {
				const { parent } = node;
				if (parent.type === "Property" && parent.value === node) return true;
				if (parent.type === "CallExpression" && parent.arguments.includes(node)) return true;
				return false;
			}
			/**
			* Reports `reportNode` when `functionNode` resolves to a `never` return type.
			*
			* `reportNode` and `functionNode` differ only for class methods, where the
			* inner function is type-checked but the `MethodDefinition` is reported on.
			*
			* @param reportNode - node the violation is reported against
			* @param functionNode - function-like node whose return type is inspected
			*/
			function checkAndReport(reportNode, functionNode) {
				if (hasNeverReturnType(functionNode)) context.report({
					node: reportNode,
					messageId: "noNeverReturn"
				});
			}
			return {
				FunctionDeclaration(node) {
					checkAndReport(node, node);
				},
				ArrowFunctionExpression(node) {
					if (isCallbackFunction(node)) return;
					checkAndReport(node, node);
				},
				FunctionExpression(node) {
					if (node.parent.type === "MethodDefinition") return;
					if (isCallbackFunction(node)) return;
					checkAndReport(node, node);
				},
				MethodDefinition(node) {
					checkAndReport(node, node.value);
				}
			};
		}
	}) }
};
//#endregion
//#region src/configs/type-aware.ts
/**
* Type-aware rule group: enables `@typescript-eslint`'s `strictTypeChecked`
* preset, forces type-aware parsing on, and wires the extra type-checked rules
* plus the custom `no-never-return-type` rule.
*
* Ownership (exclusive) — transcribed from `src/eslint.config.mjs` lines 50-58
* (sliced `strictTypeChecked` + `projectService`), line 66 (`no-never-return`),
* and lines 112-113 (`use-unknown-in-catch-callback-variable`, `only-throw-error`).
*
* `strictTypeChecked[0]` is a pure plugin/parser registration that antfu's own
* `typescript` config already provides, so it is dropped with `.slice(1)` to
* avoid a duplicate `@typescript-eslint` registration (which would double every
* type-checked report). The remaining items reference `@typescript-eslint/*`
* rules against antfu's registration, so this builder registers only the custom
* `no-never-return` plugin (antfu does NOT bundle it).
*
* `tsconfigRootDir` is deliberately omitted: the copied config pinned it to this
* package's own directory, which would resolve inside the consumer's
* `node_modules` once installed and break type-aware linting. Omitting it lets
* `projectService` default to `process.cwd()` — the consumer's project root.
*
* @param _options - Resolved factory options (unused: this group is static).
* @returns The type-aware flat-config items.
*/
function typeAwareConfig(_options) {
	return [
		...tseslint.configs.strictTypeChecked.slice(1),
		{ languageOptions: { parserOptions: { projectService: true } } },
		{
			plugins: { "no-never-return": no_never_return_type_default },
			rules: {
				"no-never-return/no-never-return-type": "error",
				"@typescript-eslint/use-unknown-in-catch-callback-variable": "error",
				"@typescript-eslint/only-throw-error": "error"
			}
		}
	];
}
//#endregion
//#region src/configs/unicorn.ts
/**
* Unicorn rule overrides: catch-block hygiene plus general strictness.
*
* Ownership (exclusive) — transcribed from `src/eslint.config.mjs` lines 94-107.
*
* antfu already bundles and registers `eslint-plugin-unicorn`, so this builder
* only overrides rule severities; it does NOT re-register the plugin.
*
* @param _options - Resolved factory options (unused: this group is static).
* @returns The unicorn override flat-config items.
*/
function unicornConfig(_options) {
	return [{ rules: {
		"unicorn/catch-error-name": ["error", { name: "error" }],
		"unicorn/prefer-optional-catch-binding": "error",
		"unicorn/throw-new-error": "off",
		"unicorn/consistent-destructuring": "error",
		"unicorn/consistent-function-scoping": "error",
		"unicorn/custom-error-definition": "error",
		"unicorn/no-lonely-if": "error",
		"unicorn/no-nested-ternary": "error",
		"unicorn/no-static-only-class": "error",
		"unicorn/prefer-class-fields": "error"
	} }];
}
//#endregion
//#region src/index.ts
/**
* Every opinionated rule-group builder, in the order their items are emitted.
*
* Order among *our* blocks is cosmetic (they own disjoint rules per the task's
* ownership map); what matters is that this whole list is emitted BEFORE any
* user config — see {@link config}.
*/
const ourConfigs = [
	typeAwareConfig,
	sonarjsConfig,
	unicornConfig,
	jsdocConfig,
	namingConfig,
	complexityConfig,
	stylisticConfig,
	promiseConfig,
	customConfig
];
/**
* Normalize the public options into the concrete shape every builder consumes.
*
* Applies the {@link DEFAULT_ALIAS} default (`{ prefix: '@', sourceDir: 'src' }`),
* filling in either field the consumer omitted, and preserves an explicit
* `alias: false` (which disables the root-alias rule downstream). Pure and total:
* it reads `options.alias` only and returns a fully-resolved value with no optionals.
*
* @param options - The raw factory options (antfu options plus our `alias`).
* @returns Resolved options with `alias` normalized to `false` or concrete settings.
*/
function resolveOptions(options) {
	const { alias } = options;
	if (alias === false) return { alias: false };
	return { alias: {
		prefix: alias?.prefix ?? DEFAULT_ALIAS.prefix,
		sourceDir: alias?.sourceDir ?? DEFAULT_ALIAS.sourceDir
	} };
}
/**
* Build the agent ESLint flat config: a thin factory over an untouched
* `@antfu/eslint-config` base with our opinionated rule groups layered on top.
*
* Composition is the override guarantee: `antfu(antfuOptions, ...ourItems,
* ...userConfigs)` emits every one of our blocks BEFORE the user's configs, so
* any trailing native `{ files, rules }` item wins by last-match-wins. Nothing
* we ship is locked.
*
* @param options - antfu options (passed through unchanged) plus the bespoke
*   `alias` option. The `alias` key is stripped before reaching antfu, since it
*   is not a valid antfu option.
* @param userConfigs - Native flat-config items appended last to override ours.
* @returns antfu's `FlatConfigComposer` (supports `.append()`/`.override()`).
*/
function config(options = {}, ...userConfigs) {
	const resolved = resolveOptions(options);
	const { alias: _alias, ...antfuOptions } = options;
	return antfu(antfuOptions, ...ourConfigs.flatMap((build) => build(resolved)), ...userConfigs);
}
//#endregion
export { config as default };
