import { safeStorage } from 'electron'
import type { SecretBox } from '../prefs/providers'

/** SecretBox backed by the OS keychain (DPAPI, Keychain, libsecret) through Electron's safeStorage. */
export const osSecretBox: SecretBox = {
  canEncrypt: () => safeStorage.isEncryptionAvailable(),
  encrypt: (plain) => safeStorage.encryptString(plain),
  decrypt: (cipher) => safeStorage.decryptString(cipher),
}
