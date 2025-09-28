import { create } from "zustand"
import { SecurityManager } from "./security"

interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  biometricEnabled: boolean
  sessionValid: boolean
  authenticate: () => Promise<boolean>
  logout: () => Promise<void>
  enableBiometric: () => Promise<boolean>
  disableBiometric: () => Promise<boolean>
  checkSession: () => Promise<boolean>
  updateActivity: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isLoading: false,
  biometricEnabled: false,
  sessionValid: false,

  authenticate: async () => {
    set({ isLoading: true })
    try {
      const biometricSuccess = await SecurityManager.authenticateWithBiometrics()
      if (biometricSuccess) {
        await SecurityManager.createSession()
        set({ isAuthenticated: true, sessionValid: true })
        return true
      }
      return false
    } catch (error) {
      console.error("Authentication failed:", error)
      return false
    } finally {
      set({ isLoading: false })
    }
  },

  logout: async () => {
    try {
      await SecurityManager.clearSession()
      set({ isAuthenticated: false, sessionValid: false })
    } catch (error) {
      console.error("Logout failed:", error)
    }
  },

  enableBiometric: async () => {
    try {
      const success = await SecurityManager.enableBiometricAuth()
      if (success) {
        set({ biometricEnabled: true })
      }
      return success
    } catch (error) {
      console.error("Failed to enable biometric:", error)
      return false
    }
  },

  disableBiometric: async () => {
    try {
      const success = await SecurityManager.disableBiometricAuth()
      if (success) {
        set({ biometricEnabled: false })
      }
      return success
    } catch (error) {
      console.error("Failed to disable biometric:", error)
      return false
    }
  },

  checkSession: async () => {
    try {
      const isValid = await SecurityManager.validateSession()
      const biometricEnabled = await SecurityManager.isBiometricEnabled()

      set({
        sessionValid: isValid,
        isAuthenticated: isValid,
        biometricEnabled,
      })

      return isValid
    } catch (error) {
      console.error("Session check failed:", error)
      set({ sessionValid: false, isAuthenticated: false })
      return false
    }
  },

  updateActivity: async () => {
    try {
      await SecurityManager.updateLastActivity()
    } catch (error) {
      console.error("Failed to update activity:", error)
    }
  },
}))
