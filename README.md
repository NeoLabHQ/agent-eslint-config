# agent-eslint-config

Overly opionated eslint config for agents. Forces them to write low complexity and highly readable code. Supports: Claude, Gemini, Codex and many more.

## Usage

```bash
npm install @neolabhq/agent-eslint-config
```

## Recomendations

In order to make code even more strict, add this to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": "./",
    "paths": {
      "@/*": ["./src/*"]
    },
    "strict": true
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": false,
    "noImplicitOverride": true,
    "declaration": true,
    "emitDeclarationOnly": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
  }
}
```

Eslint have few limitations due to architecture that processes each file separately, not allowing to make cross-file rules. So to add code dublication checks you can use `jscpd` and for unused code checks, you can add `knip`.

```bash
npm install -D jscpd knip
```

Create `knip.json` file:

```json
{
  "$schema": "https://unpkg.com/knip@5/schema.json",
  "entry": ["src/main.{js,ts}"],
  "project": ["src/**/*.{js,ts}"],
  "tags": ["-lintignore"],
  "rules": {
    "devDependencies": "off",
    "exports": "error",
    "types": "off"
  }
}
```

Then include them in your `package.json`:

```json
{
  "scripts": {
    "lint": "npm run typecheck && npm run lint:jscpd && npm run lint:knip && npm run lint:eslint",
    "lint:fix": "npm run typecheck && npm run lint:jscpd && npm run lint:eslint -- --fix && npm run lint:knip -- --fix",
    "typecheck": "tsc --noEmit",
    "lint:eslint": "eslint \"{src,apps,libs,test}/**/*.ts\"",
    "lint:jscpd": "jscpd --pattern 'src/**/*.{ts,tsx}' -i '**/*.spec.*' -t 0.1",
    "lint:knip": "knip",
  }
}
```