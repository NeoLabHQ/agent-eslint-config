// Clean: security-sensitive values are injected at runtime rather than written
// as literals, so the no-hardcoded-* rules have nothing to flag.

/** Security-sensitive settings supplied by the environment at runtime. */
export interface Secrets {
  serverHost: string
  password: string
  apiKey: string
  secret: string
}

/**
 * Returns the injected secrets rather than any hardcoded literal.
 * @param secrets the runtime-provided secrets
 * @returns the same secrets
 */
export function loadSecrets(secrets: Secrets): Secrets {
  return secrets
}
