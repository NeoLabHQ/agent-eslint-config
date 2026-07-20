// Targets: sonarjs/no-hardcoded-ip, sonarjs/no-hardcoded-passwords,
// sonarjs/no-hardcoded-secrets

/** A hardcoded IPv4 address literal. */
export const serverHost = '10.5.32.44'

/** A hardcoded password assigned to a password-named binding. */
export const password = 'examplePassw0rd!'

/** A hardcoded, high-entropy API key literal. */
export const apiKey = 'ZmFrZS1zZWNyZXQtdG9rZW4xMjM0NTY3ODkwYWJjZGVmZ2hpamtsbW5vcA'

/** A hardcoded, high-entropy secret literal. */
export const secret = 'F4GCHqmu8yeD4ATZ2td8PazSfogAWMH6XHbaI/ApBvOr7e51'
