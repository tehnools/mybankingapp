import { Platform } from "react-native"
import * as SecureStore from "expo-secure-store"
import * as LocalAuthentication from "expo-local-authentication"
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
  private static readonly SESSION_KEY = "user_session"
  private static readonly USER_PROFILE_KEY = "akahu_user_profile"

  // Session timeout in milliseconds (15 minutes)
  private static readonly SESSION_TIMEOUT = 15 * 60 * 1000

  static async initializeSecurity() {
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
   * Prompts the user for biometric / device credential authentication.
   */
  static async promptBiometric(promptMessage: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (Platform.OS === "web") {
        return { success: true }
      }

      const hasHardware = await LocalAuthentication.hasHardwareAsync()
      const isEnrolled = await LocalAuthentication.isEnrolledAsync()

      if (!hasHardware || !isEnrolled) {
        return {
          success: false,
          error:
            "Biometrics or device screen lock is not set up on this phone. Please enable Fingerprint/Face Unlock in your phone settings.",
        }
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        fallbackLabel: "Use passcode",
        cancelLabel: "Cancel",
        disableDeviceFallback: false,
      })

      if (result.success) {
        return { success: true }
      }

      return {
        success: false,
        error: "Biometric authentication was cancelled or failed.",
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
    promptMessage = "Authenticate with biometrics to lock and secure your Akahu tokens",
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
    } catch (error) {
      return false
    }
  }

  /**
   * Ensures that if tokens or biometric security were stored, the phone still has
   * biometrics enrolled at the OS level. If the user removed their fingerprints / Face ID
   * from phone settings, all stored Akahu tokens are automatically wiped.
   */
  static async verifyDeviceBiometricIntegrity(): Promise<{
    intact: boolean
    wipedDueToMissingBiometrics: boolean
  }> {
    try {
      if (Platform.OS === "web") {
        return { intact: true, wipedDueToMissingBiometrics: false }
      }

      const bioEnabled = await this.isBiometricEnabled()
      const hasAppToken = Boolean(await getItem("akahu_app_token"))
      const hasAccessToken = Boolean(await getItem("akahu_access_token"))

      if (!bioEnabled && !hasAppToken && !hasAccessToken) {
        return { intact: true, wipedDueToMissingBiometrics: false }
      }

      const hasHardware = await LocalAuthentication.hasHardwareAsync()
      const isEnrolled = await LocalAuthentication.isEnrolledAsync()

      if (!hasHardware || !isEnrolled) {
        await this.clearAllSecureData()
        return { intact: false, wipedDueToMissingBiometrics: true }
      }

      return { intact: true, wipedDueToMissingBiometrics: false }
    } catch (error) {
      console.error("Failed to verify biometric integrity:", error)
      return { intact: true, wipedDueToMissingBiometrics: false }
    }
  }

  static async storeUserProfile(user: Record<string, any>): Promise<void> {
    await setItem(this.USER_PROFILE_KEY, JSON.stringify(user))
  }

  static async getUserProfile(): Promise<Record<string, any> | null> {
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
      await this.deleteSecureData("user_preferences")
    } catch (error) {
      console.error("Failed to clear all secure data:", error)
    }
  }
}
