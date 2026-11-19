import { Platform } from "react-native"
import * as SecureStore from "expo-secure-store"
import * as LocalAuthentication from "expo-local-authentication"
import * as Crypto from "expo-crypto"
import * as Device from "expo-device"

// Cross-platform secure storage helper (uses SecureStore on iOS/Android, localStorage on web preview)
async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(key, value)
    }
    return
  }
  await SecureStore.setItemAsync(key, value)
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(key)
    }
    return null
  }
  return await SecureStore.getItemAsync(key)
}

async function deleteItem(key: string): Promise<void> {
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

  static async enableBiometricAuth(): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Enable biometric authentication",
        fallbackLabel: "Use passcode",
        cancelLabel: "Cancel",
      })

      if (result.success) {
        await setItem(this.BIOMETRIC_KEY, "true")
        return true
      }

      return false
    } catch (error) {
      console.error("Failed to enable biometric auth:", error)
      return false
    }
  }

  static async disableBiometricAuth(): Promise<boolean> {
    try {
      await deleteItem(this.BIOMETRIC_KEY)
      return true
    } catch (error) {
      console.error("Failed to disable biometric auth:", error)
      return false
    }
  }

  static async isBiometricEnabled(): Promise<boolean> {
    try {
      const enabled = await getItem(this.BIOMETRIC_KEY)
      return enabled === "true"
    } catch (error) {
      return false
    }
  }

  static async authenticateWithBiometrics(): Promise<boolean> {
    try {
      const isEnabled = await this.isBiometricEnabled()
      if (!isEnabled) return true

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate to access your financial data",
        fallbackLabel: "Use passcode",
        cancelLabel: "Cancel",
      })

      return result.success
    } catch (error) {
      console.error("Biometric authentication failed:", error)
      return false
    }
  }

  static async encryptData(data: string): Promise<string> {
    try {
      const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, data, {
        encoding: Crypto.CryptoEncoding.HEX,
      })
      return digest
    } catch (error) {
      console.error("Failed to encrypt data:", error)
      return data
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

  static async createSession(): Promise<string> {
    try {
      const sessionId = Crypto.randomUUID()
      const sessionData = {
        id: sessionId,
        createdAt: Date.now(),
        lastActivity: Date.now(),
      }

      await this.storeSecureData(this.SESSION_KEY, JSON.stringify(sessionData))
      return sessionId
    } catch (error) {
      console.error("Failed to create session:", error)
      throw error
    }
  }

  static async validateSession(): Promise<boolean> {
    try {
      const sessionData = await this.getSecureData(this.SESSION_KEY)
      if (!sessionData) return false

      const session = JSON.parse(sessionData)
      const now = Date.now()
      const timeSinceLastActivity = now - session.lastActivity

      if (timeSinceLastActivity > this.SESSION_TIMEOUT) {
        await this.clearSession()
        return false
      }

      await this.updateLastActivity()
      return true
    } catch (error) {
      console.error("Failed to validate session:", error)
      return false
    }
  }

  static async updateLastActivity(): Promise<void> {
    try {
      const sessionData = await this.getSecureData(this.SESSION_KEY)
      if (sessionData) {
        const session = JSON.parse(sessionData)
        session.lastActivity = Date.now()
        await this.storeSecureData(this.SESSION_KEY, JSON.stringify(session))
      }
    } catch (error) {
      console.error("Failed to update last activity:", error)
    }
  }

  static async clearSession(): Promise<void> {
    try {
      await this.deleteSecureData(this.SESSION_KEY)
    } catch (error) {
      console.error("Failed to clear session:", error)
    }
  }

  static async clearAllSecureData(): Promise<void> {
    try {
      await this.deleteSecureData("akahu_app_token")
      await this.deleteSecureData("akahu_access_token")
      await this.deleteSecureData(this.SESSION_KEY)
      await this.deleteSecureData(this.BIOMETRIC_KEY)
      await this.deleteSecureData("user_preferences")
    } catch (error) {
      console.error("Failed to clear all secure data:", error)
    }
  }
}
