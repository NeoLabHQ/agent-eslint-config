# Contributing


## Development

- Install dependencies:

```bash
npm install
```

- Run all verification commands:

```bash
npm run verify
```

- `npm run test` - Run the unit tests:
- `npm run lint` - Run the linter:
- `npm run build` - Build the library:
- `npm run test:e2e` - Run the end-to-end tests:

## Commits and Releases

This project uses **semantic-release** for automated versioning and changelog generation. All commits MUST follow the [Conventional Commits](https://www.conventionalcommits.org/) format.

### Creating a commit

Instead of `git commit`, use:

```bash
git add .
npm run commit
```

Or, to stage everything and commit in one step:

```bash
npm run cz
```

This launches an interactive prompt (commitizen) that guides you through producing a properly formatted commit message.

### Commit format

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

**Types:**

- `feat` — new feature (triggers a minor version bump)
- `fix` — bug fix (triggers a patch version bump)
- `docs` — documentation changes
- `style` — code style changes (formatting, no code change)
- `refactor` — code refactoring
- `perf` — performance improvements
- `test` — adding or updating tests
- `chore` — maintenance tasks
- `ci` — CI/CD changes

**Breaking changes:** add `BREAKING CHANGE:` in the footer or `!` after the type (e.g. `feat!:`) to trigger a major version bump.