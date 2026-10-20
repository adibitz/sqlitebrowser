import { safeStorage } from 'electron'

/** Encrypts secrets at rest. `canEncrypt()` is false when the OS offers no secure storage. */
export interface SecretBox {
  canEncrypt(): boolean
  encrypt(plain: string): Buffer
  decrypt(cipher: Buffer): string
}

/** SecretBox backed by the OS keychain (DPAPI, Keychain, libsecret) through Electron's safeStorage. */
export const osSecretBox: SecretBox = {
  canEncrypt: () => safeStorage.isEncryptionAvailable(),
  encrypt: (plain) => safeStorage.encryptString(plain),
  decrypt: (cipher) => safeStorage.decryptString(cipher),
}
