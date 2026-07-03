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