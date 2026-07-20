// Clean: no relative import reaches into the source dir, so `alias/prefer-alias`
// has nothing to rewrite. (The alias form `@/thing` cannot be used here because
// the demo tsconfig defines no path mapping for it.)
export const answer = 42
