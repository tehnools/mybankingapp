import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { akahuClient } from "../lib/akahu-client"
import { AkahuAuth } from "../lib/akahu-auth"
import { SecurityManager } from "../lib/security"
import { useAppStore, useSettingsFormStore } from "../lib/store"
import type { AkahuRawAccount, BankAccount } from "../types"

function mapAkahuAccountType(rawType?: string): BankAccount["type"] {
  switch (rawType?.toUpperCase()) {
    case "CREDITCARD":
    case "CREDIT_CARD":
      return "credit"
    case "SAVINGS":
    case "TERMDEPOSIT":
      return "savings"
    case "KIWISAVER":
      return "kiwisaver"
    case "INVESTMENT":
      return "investment"
    case "LOAN":
    case "MORTGAGE":
      return "loan"
    default:
      return "checking"
  }
}

export function useAkahuStoredSettings() {
  return useQuery({
    queryKey: ["akahu", "stored-settings"],
    queryFn: async () => {
      const stored = await akahuClient.getStoredCredentials()
      const biometricEnabled = await SecurityManager.isBiometricEnabled()
      const appToken = stored.appToken || ""
      const accessToken = stored.accessToken || ""
      const hasStoredTokens = Boolean(appToken && accessToken)

      return {
        appToken,
        accessToken,
        biometricEnabled,
        hasStoredTokens,
      }
    },
  })
}

export function useAutoBiometricUnlock(shouldPrompt: boolean) {
  const setSessionUnlocked = useAppStore((s) => s.setSessionUnlocked)

  return useQuery({
    queryKey: ["akahu", "auto-biometric-unlock", shouldPrompt],
    queryFn: async () => {
      const result = await SecurityManager.promptBiometric("Authenticate to unlock NZ Money Manager")
      if (!result.success) {
        throw new Error(result.error || "Biometric authentication required to open the app.")
      }
      setSessionUnlocked(true)
      return true
    },
    enabled: shouldPrompt,
    retry: false,
    staleTime: 0,
    gcTime: 0,
  })
}

export function useUnlockAppSession() {
  const setSessionUnlocked = useAppStore((s) => s.setSessionUnlocked)

  return useMutation({
    mutationFn: async () => {
      const result = await SecurityManager.promptBiometric("Authenticate to unlock NZ Money Manager")
      if (!result.success) {
        throw new Error(result.error || "Biometric unlock failed.")
      }
      setSessionUnlocked(true)
      return true
    },
  })
}

export function useUnlockCredentialsForm() {
  const unlockFormWithTokens = useSettingsFormStore((s) => s.unlockFormWithTokens)

  return useMutation({
    mutationFn: async () => {
      const auth = await SecurityManager.promptBiometric("Authenticate to unlock and edit your Akahu tokens")
      if (!auth.success) {
        throw new Error(auth.error || "Biometric unlock failed.")
      }
      const stored = await akahuClient.getStoredCredentials()
      unlockFormWithTokens(stored.appToken || "", stored.accessToken || "")
      return true
    },
  })
}

export function useAkahuConnection() {
  return useQuery({
    queryKey: ["akahu", "connection"],
    queryFn: async () => {
      try {
        await akahuClient.initialize()
        const { appToken, accessToken } = await akahuClient.getStoredCredentials()
        if (!appToken || !accessToken) {
          return { connected: false, user: null }
        }
        const me = await akahuClient.getMe()
        return { connected: !!me?.item, user: me?.item || null }
      } catch (error) {
        return { connected: false, user: null }
      }
    },
    retry: false,
  })
}

export function useSaveAkahuTokens() {
  const queryClient = useQueryClient()
  const setSessionUnlocked = useAppStore((s) => s.setSessionUnlocked)
  const setConnected = useAppStore((s) => s.setConnected)
  const lockForm = useSettingsFormStore((s) => s.lockForm)

  return useMutation({
    mutationFn: async ({ appToken, userToken }: { appToken: string; userToken: string }) => {
      if (!appToken.trim() || !userToken.trim()) {
        throw new Error("Please enter both your App ID Token and User Access Token.")
      }

      const result = await AkahuAuth.connectWithPersonalTokens(appToken, userToken)
      if (!result.success) {
        throw new Error(result.error || "Could not verify tokens with Akahu.")
      }

      const bioResult = await SecurityManager.enableBiometricAuth(
        "Authenticate with biometrics to lock and store your Akahu tokens",
      )

      if (!bioResult.success) {
        await AkahuAuth.disconnect()
        throw new Error(bioResult.error || "Biometric confirmation is required to store your Akahu tokens.")
      }

      if (result.user) {
        await SecurityManager.storeUserProfile(result.user)
      }

      lockForm()
      setConnected(true)
      setSessionUnlocked(true)
      return result.user
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["akahu"] })
    },
  })
}

export function useWipeAkahuTokens() {
  const queryClient = useQueryClient()
  const setSessionUnlocked = useAppStore((s) => s.setSessionUnlocked)
  const setConnected = useAppStore((s) => s.setConnected)
  const resetForm = useSettingsFormStore((s) => s.resetForm)
  const setShowWipeModal = useSettingsFormStore((s) => s.setShowWipeModal)

  return useMutation({
    mutationFn: async () => {
      const auth = await SecurityManager.promptBiometric(
        "Authenticate to turn off biometrics and wipe your Akahu tokens",
      )

      if (!auth.success) {
        setShowWipeModal(false)
        throw new Error(auth.error || "Biometric verification required to turn off security.")
      }

      await SecurityManager.clearAllSecureData()
      await AkahuAuth.disconnect()
      resetForm()
      setConnected(false)
      setSessionUnlocked(false)
      return true
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["akahu"] })
    },
  })
}

export function useAkahuAccounts() {
  const { data: connection } = useAkahuConnection()

  return useQuery({
    queryKey: ["akahu", "accounts"],
    queryFn: async () => {
      const response = await akahuClient.getAccounts()

      const accounts: BankAccount[] =
        response.items?.map((account: AkahuRawAccount) => ({
          id: account._id,
          name: account.name,
          bank: account.connection?.name || "NZ Bank",
          accountNumber: account.formatted_account || "••••",
          balance: account.balance?.current ?? 0,
          availableBalance: account.balance?.available,
          type: mapAkahuAccountType(account.type),
          status: account.status,
          lastRefreshed: account.refreshed?.balance || account.refreshed?.transactions,
        })) || []

      return accounts
    },
    enabled: !!connection?.connected,
  })
}

export function useRefreshAkahu() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (accountOrConnectionId?: string) => {
      return await akahuClient.refreshAccounts(accountOrConnectionId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["akahu", "accounts"] })
    },
  })
}
