import { Platform } from "react-native"
import * as SecureStore from "expo-secure-store"
import * as LocalAuthentication from "expo-local-authentication"
import * as Crypto from "expo-crypto"
import * as Device from "expo-device"

// Cross-platform secure storage helper (uses SecureStore on iOS/Android, localStorage on web preview)
const setItem = async (key: string, value: string): Promise<void> => {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, value)
    }
    return
  }
  await SecureStore.setItemAsync(key, value)
}

const getItem = async (key: string): Promise<string | null> => {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(key)
    }
    return null
  }
  return await SecureStore.getItemAsync(key)
}

const deleteItem = async (key: string): Promise<void> => {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(key)
    }
    return
  }
  await SecureStore.deleteItemAsync(key)
}

export class SecurityManager {
  private static readonly BIOMETRIC_KEY = "biometric_enabled"
  private static readonly PIN_HASH_KEY = "app_pin_hash"
  private static readonly PIN_SALT_KEY = "app_pin_salt"
  private static readonly SESSION_KEY = "user_session"
  private static readonly USER_PROFILE_KEY = "akahu_user_profile"

  static async initializeSecurity(): Promise<{
    hasHardware: boolean
    isEnrolled: boolean
    supportedTypes: LocalAuthentication.AuthenticationType[]
    deviceName: string | null
    isDevice: boolean
  } | null> {
    try {
      if (Platform.OS === "web") {
        return {
          hasHardware: false,
          isEnrolled: false,
          supportedTypes: [],
          deviceName: "Web Browser",
          isDevice: false,
        }
      }

      const hasHardware = await LocalAuthentication.hasHardwareAsync()
      const isEnrolled = await LocalAuthentication.isEnrolledAsync()
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync()

      return {
        hasHardware,
        isEnrolled,
        supportedTypes,
        deviceName: Device.deviceName,
        isDevice: Device.isDevice,
      }
    } catch (error) {
      console.error("Failed to initialize security:", error)
      return null
    }
  }

  /**
   * Hashes and stores a mandatory 6-digit App PIN using a random salt + SHA-256.
   */
  static async setPin(pin: string): Promise<void> {
    if (!/^\d{6}$/.test(pin)) {
      throw new Error("PIN must be exactly 6 digits.")
    }
    const salt = Crypto.randomUUID()
    const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`, {
      encoding: Crypto.CryptoEncoding.HEX,
    })
    await setItem(this.PIN_SALT_KEY, salt)
    await setItem(this.PIN_HASH_KEY, hash)
  }

  /**
   * Verifies a 6-digit PIN against the stored salted SHA-256 hash.
   */
  static async verifyPin(pin: string): Promise<boolean> {
    if (!/^\d{6}$/.test(pin)) return false
    const salt = await getItem(this.PIN_SALT_KEY)
    const storedHash = await getItem(this.PIN_HASH_KEY)
    if (!salt || !storedHash) return false

    const candidateHash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`, {
      encoding: Crypto.CryptoEncoding.HEX,
    })
    return candidateHash === storedHash
  }

  static async hasPin(): Promise<boolean> {
    try {
      const storedHash = await getItem(this.PIN_HASH_KEY)
      return Boolean(storedHash)
    } catch {
      return false
    }
  }

  static async clearPin(): Promise<void> {
    await deleteItem(this.PIN_HASH_KEY)
    await deleteItem(this.PIN_SALT_KEY)
  }

  /**
   * Checks whether device biometric hardware is available and enrolled.
   */
  static async canUseBiometrics(): Promise<boolean> {
    if (Platform.OS === "web") return false
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync()
      const isEnrolled = await LocalAuthentication.isEnrolledAsync()
      return hasHardware && isEnrolled
    } catch {
      return false
    }
  }

  /**
   * Prompts the user for biometric authentication.
   */
  static async promptBiometric(promptMessage: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (Platform.OS === "web") {
        return { success: false, error: "Biometrics not available on web. Use your 6-digit PIN." }
      }

      const available = await this.canUseBiometrics()
      if (!available) {
        return {
          success: false,
          error: "Biometrics are not enrolled on this device. Please use your 6-digit PIN.",
        }
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel: "Use 6-digit PIN",
        cancelLabel: "Use PIN",
        disableDeviceFallback: true,
      })

      if (result.success) {
        return { success: true }
      }

      return {
        success: false,
        error: "Biometric authentication was cancelled. You can unlock with your 6-digit PIN.",
      }
    } catch (error) {
      console.error("Biometric prompt failed:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Biometric error",
      }
    }
  }

  static async setBiometricEnabled(enabled: boolean): Promise<void> {
    if (enabled) {
      await setItem(this.BIOMETRIC_KEY, "true")
    } else {
      await deleteItem(this.BIOMETRIC_KEY)
    }
  }

  static async enableBiometricAuth(
    promptMessage = "Enable biometrics for faster unlock",
  ): Promise<{ success: boolean; error?: string }> {
    const auth = await this.promptBiometric(promptMessage)
    if (auth.success) {
      await this.setBiometricEnabled(true)
      return { success: true }
    }
    return auth
  }

  static async isBiometricEnabled(): Promise<boolean> {
    try {
      const enabled = await getItem(this.BIOMETRIC_KEY)
      return enabled === "true"
    } catch {
      return false
    }
  }

  /**
   * If the user removed fingerprints / Face ID from their phone OS while biometrics were enabled,
   * gracefully disable the biometric shortcut and keep stored tokens + 6-digit PIN intact!
   */
  static async syncDeviceBiometricAvailability(): Promise<{
    biometricEnabled: boolean
    biometricsDisabledByOs: boolean
  }> {
    try {
      const enabled = await this.isBiometricEnabled()
      if (!enabled) {
        return { biometricEnabled: false, biometricsDisabledByOs: false }
      }

      if (Platform.OS === "web") {
        return { biometricEnabled: false, biometricsDisabledByOs: false }
      }

      const available = await this.canUseBiometrics()
      if (!available) {
        await this.setBiometricEnabled(false)
        return { biometricEnabled: false, biometricsDisabledByOs: true }
      }

      return { biometricEnabled: true, biometricsDisabledByOs: false }
    } catch {
      return { biometricEnabled: false, biometricsDisabledByOs: false }
    }
  }

  static async storeUserProfile(user: Record<string, unknown>): Promise<void> {
    await setItem(this.USER_PROFILE_KEY, JSON.stringify(user))
  }

  static async getUserProfile(): Promise<Record<string, unknown> | null> {
    const raw = await getItem(this.USER_PROFILE_KEY)
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  static async storeSecureData(key: string, value: string): Promise<boolean> {
    try {
      await setItem(key, value)
      return true
    } catch (error) {
      console.error("Failed to store secure data:", error)
      return false
    }
  }

  static async getSecureData(key: string): Promise<string | null> {
    try {
      return await getItem(key)
    } catch (error) {
      console.error("Failed to get secure data:", error)
      return null
    }
  }

  static async deleteSecureData(key: string): Promise<boolean> {
    try {
      await deleteItem(key)
      return true
    } catch (error) {
      console.error("Failed to delete secure data:", error)
      return false
    }
  }

  static async clearAllSecureData(): Promise<void> {
    try {
      await this.deleteSecureData("akahu_app_token")
      await this.deleteSecureData("akahu_access_token")
      await this.deleteSecureData(this.USER_PROFILE_KEY)
      await this.deleteSecureData(this.SESSION_KEY)
      await this.deleteSecureData(this.BIOMETRIC_KEY)
      await this.clearPin()
      await this.deleteSecureData("user_preferences")
    } catch (error) {
      console.error("Failed to clear all secure data:", error)
    }
  }
}
