import * as Clipboard from "expo-clipboard"
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from "@tanstack/react-query"
import { akahuClient } from "../lib/akahu-client"
import { AkahuAuth } from "../lib/akahu-auth"
import { SecurityManager } from "../lib/security"
import { useAppStore, useSettingsFormStore } from "../lib/store"
import type {
  AkahuClipboardPasteResult,
  AkahuConnectionStatus,
  AkahuRawAccount,
  AkahuStoredSettings,
  AkahuUser,
  BankAccount,
} from "../types"

const extractAndPasteTokensFromClipboard = async (): Promise<AkahuClipboardPasteResult> => {
  try {
    // Brief delay so Android 12+ window focus is active when returning from browser
    await new Promise<void>((resolve) => setTimeout(resolve, 200))
    const text = (await Clipboard.getStringAsync()).trim()
    if (!text) {
      return { pastedAppToken: null, pastedUserToken: null }
    }

    const appTokenMatch = text.match(/app_token_[A-Za-z0-9]+/)
    const userTokenMatch = text.match(/user_token_[A-Za-z0-9]+/)

    const { draftAppToken, draftUserToken, setDraftAppToken, setDraftUserToken } = useSettingsFormStore.getState()

    let pastedAppToken: string | null = null
    let pastedUserToken: string | null = null

    if (appTokenMatch && appTokenMatch[0] !== draftAppToken) {
      pastedAppToken = appTokenMatch[0]
      setDraftAppToken(pastedAppToken)
    }

    if (userTokenMatch && userTokenMatch[0] !== draftUserToken) {
      pastedUserToken = userTokenMatch[0]
      setDraftUserToken(pastedUserToken)
    }

    return { pastedAppToken, pastedUserToken }
  } catch {
    return { pastedAppToken: null, pastedUserToken: null }
  }
}

export const useAutoPasteAkahuClipboard = (enabled: boolean): UseQueryResult<AkahuClipboardPasteResult, Error> => {
  return useQuery<AkahuClipboardPasteResult, Error>({
    queryKey: ["akahu", "clipboard-auto-paste", enabled],
    queryFn: extractAndPasteTokensFromClipboard,
    enabled,
    refetchOnWindowFocus: "always",
    staleTime: 0,
    gcTime: 0,
    retry: false,
  })
}

export const usePasteAkahuClipboard = (): UseMutationResult<AkahuClipboardPasteResult, Error, void> => {
  return useMutation<AkahuClipboardPasteResult, Error, void>({
    mutationFn: extractAndPasteTokensFromClipboard,
  })
}

const mapAkahuAccountType = (rawType?: string): BankAccount["type"] => {
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

export const useAkahuStoredSettings = (): UseQueryResult<AkahuStoredSettings, Error> => {
  const resetForm = useSettingsFormStore((s) => s.resetForm)
  const setConnected = useAppStore((s) => s.setConnected)

  return useQuery<AkahuStoredSettings, Error>({
    queryKey: ["akahu", "stored-settings"],
    queryFn: async (): Promise<AkahuStoredSettings> => {
      const integrity = await SecurityManager.verifyDeviceBiometricIntegrity()
      if (integrity.wipedDueToMissingBiometrics) {
        await akahuClient.clearCredentials()
        resetForm()
        setConnected(false)
        return {
          appToken: "",
          accessToken: "",
          biometricEnabled: false,
          hasStoredTokens: false,
          wipedDueToMissingBiometrics: true,
        }
      }

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
        wipedDueToMissingBiometrics: false,
      }
    },
  })
}

export const useAutoBiometricUnlock = (shouldPrompt: boolean): UseQueryResult<boolean, Error> => {
  const setSessionUnlocked = useAppStore((s) => s.setSessionUnlocked)

  return useQuery<boolean, Error>({
    queryKey: ["akahu", "auto-biometric-unlock", shouldPrompt],
    queryFn: async (): Promise<boolean> => {
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

export const useUnlockAppSession = (): UseMutationResult<boolean, Error, void> => {
  const setSessionUnlocked = useAppStore((s) => s.setSessionUnlocked)

  return useMutation<boolean, Error, void>({
    mutationFn: async (): Promise<boolean> => {
      const result = await SecurityManager.promptBiometric("Authenticate to unlock NZ Money Manager")
      if (!result.success) {
        throw new Error(result.error || "Biometric unlock failed.")
      }
      setSessionUnlocked(true)
      return true
    },
  })
}

export const useUnlockCredentialsForm = (): UseMutationResult<boolean, Error, void> => {
  const unlockFormWithTokens = useSettingsFormStore((s) => s.unlockFormWithTokens)

  return useMutation<boolean, Error, void>({
    mutationFn: async (): Promise<boolean> => {
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

export const useAkahuConnection = (): UseQueryResult<AkahuConnectionStatus, Error> => {
  return useQuery<AkahuConnectionStatus, Error>({
    queryKey: ["akahu", "connection"],
    queryFn: async (): Promise<AkahuConnectionStatus> => {
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

export const useSaveAkahuTokens = (): UseMutationResult<
  AkahuUser | undefined,
  Error,
  { appToken: string; userToken: string }
> => {
  const queryClient = useQueryClient()
  const setSessionUnlocked = useAppStore((s) => s.setSessionUnlocked)
  const setConnected = useAppStore((s) => s.setConnected)
  const lockForm = useSettingsFormStore((s) => s.lockForm)

  return useMutation<AkahuUser | undefined, Error, { appToken: string; userToken: string }>({
    mutationFn: async ({
      appToken,
      userToken,
    }: {
      appToken: string
      userToken: string
    }): Promise<AkahuUser | undefined> => {
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
    onSuccess: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ["akahu"] })
    },
  })
}

export const useWipeAkahuTokens = (): UseMutationResult<boolean, Error, void> => {
  const queryClient = useQueryClient()
  const setSessionUnlocked = useAppStore((s) => s.setSessionUnlocked)
  const setConnected = useAppStore((s) => s.setConnected)
  const resetForm = useSettingsFormStore((s) => s.resetForm)
  const setShowWipeModal = useSettingsFormStore((s) => s.setShowWipeModal)

  return useMutation<boolean, Error, void>({
    mutationFn: async (): Promise<boolean> => {
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
    onSuccess: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ["akahu"] })
    },
  })
}

export const useAkahuAccounts = (): UseQueryResult<BankAccount[], Error> => {
  const { data: connection } = useAkahuConnection()

  return useQuery<BankAccount[], Error>({
    queryKey: ["akahu", "accounts"],
    queryFn: async (): Promise<BankAccount[]> => {
      const response = await akahuClient.getAccounts()

      const accounts: BankAccount[] =
        response.items?.map((account: AkahuRawAccount): BankAccount => ({
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

export const useRefreshAkahu = (): UseMutationResult<{ success: boolean }, Error, string | undefined> => {
  const queryClient = useQueryClient()

  return useMutation<{ success: boolean }, Error, string | undefined>({
    mutationFn: async (accountOrConnectionId?: string): Promise<{ success: boolean }> => {
      return await akahuClient.refreshAccounts(accountOrConnectionId)
    },
    onSuccess: (): void => {
      queryClient.invalidateQueries({ queryKey: ["akahu", "accounts"] })
    },
  })
}
