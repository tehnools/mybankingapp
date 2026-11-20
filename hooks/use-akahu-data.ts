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
import { syncConnectionBranding } from "../lib/bank-branding"
import {
  clearAccountsDb,
  clearConnectionBrandColors,
  getCachedAccountByIdFromDb,
  getCachedAccountsFromDb,
  getCachedConnectionByIdFromDb,
  getCachedConnectionsFromDb,
  upsertAccountsToDb,
  upsertConnectionsToDb,
} from "../lib/db"
import { SecurityManager } from "../lib/security"
import { useAppStore, useLockScreenStore, useSettingsFormStore } from "../lib/store"
import type {
  AkahuClipboardPasteResult,
  AkahuConnectionStatus,
  AkahuRawAccount,
  AkahuStoredSettings,
  AkahuUser,
  BankAccount,
  BankConnection,
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
  return useQuery<AkahuStoredSettings, Error>({
    queryKey: ["akahu", "stored-settings"],
    queryFn: async (): Promise<AkahuStoredSettings> => {
      // If biometrics were removed from the phone OS, gracefully disable the biometric shortcut
      // without wiping tokens — the mandatory 6-digit PIN remains active as fallback!
      const bioSync = await SecurityManager.syncDeviceBiometricAvailability()
      const stored = await akahuClient.getStoredCredentials()
      const hasPin = await SecurityManager.hasPin()

      const appToken = stored.appToken || ""
      const accessToken = stored.accessToken || ""
      const hasStoredTokens = Boolean(appToken && accessToken)

      return {
        appToken,
        accessToken,
        hasPin,
        biometricEnabled: bioSync.biometricEnabled,
        hasStoredTokens,
        biometricsDisabledByOs: bioSync.biometricsDisabledByOs,
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
        throw new Error(result.error || "Enter your 6-digit PIN to unlock.")
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
        throw new Error(result.error || "Biometric unlock failed. Enter your 6-digit PIN instead.")
      }
      setSessionUnlocked(true)
      return true
    },
  })
}

export const useUnlockAppWithPin = (): UseMutationResult<boolean, Error, string> => {
  const setSessionUnlocked = useAppStore((s) => s.setSessionUnlocked)
  const clearPinInput = useLockScreenStore((s) => s.clearPinInput)

  return useMutation<boolean, Error, string>({
    mutationFn: async (pin: string): Promise<boolean> => {
      const valid = await SecurityManager.verifyPin(pin)
      if (!valid) {
        clearPinInput()
        throw new Error("Incorrect 6-digit PIN. Please try again.")
      }
      clearPinInput()
      setSessionUnlocked(true)
      return true
    },
  })
}

export const useUnlockCredentialsForm = (): UseMutationResult<boolean, Error, { biometricEnabled: boolean }> => {
  const unlockFormWithTokens = useSettingsFormStore((s) => s.unlockFormWithTokens)
  const openPinFlow = useSettingsFormStore((s) => s.openPinFlow)

  return useMutation<boolean, Error, { biometricEnabled: boolean }>({
    mutationFn: async ({ biometricEnabled }: { biometricEnabled: boolean }): Promise<boolean> => {
      if (biometricEnabled) {
        const auth = await SecurityManager.promptBiometric("Authenticate to unlock and edit your Akahu tokens")
        if (auth.success) {
          const stored = await akahuClient.getStoredCredentials()
          unlockFormWithTokens(stored.appToken || "", stored.accessToken || "")
          return true
        }
      }

      // Fallback to mandatory 6-digit PIN modal
      openPinFlow("verify-edit")
      return false
    },
  })
}

export const useVerifyPinForEdit = (): UseMutationResult<boolean, Error, string> => {
  const unlockFormWithTokens = useSettingsFormStore((s) => s.unlockFormWithTokens)
  const setPinError = useSettingsFormStore((s) => s.setPinError)

  return useMutation<boolean, Error, string>({
    mutationFn: async (pin: string): Promise<boolean> => {
      const valid = await SecurityManager.verifyPin(pin)
      if (!valid) {
        setPinError("Incorrect 6-digit PIN. Please try again.")
        throw new Error("Incorrect 6-digit PIN.")
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
      } catch {
        return { connected: false, user: null }
      }
    },
    retry: false,
  })
}

/**
 * Step 1 of saving Akahu tokens:
 * - Verifies tokens against Akahu (/v1/me)
 * - If no 6-digit PIN exists yet, opens the mandatory 6-digit PIN setup flow (PIN first -> Biometric uplift)
 * - If a 6-digit PIN already exists, saves and locks the updated tokens immediately
 */
export const useSaveAkahuTokens = (): UseMutationResult<
  { user?: AkahuUser; needsPinSetup: boolean },
  Error,
  { appToken: string; userToken: string }
> => {
  const queryClient = useQueryClient()
  const setSessionUnlocked = useAppStore((s) => s.setSessionUnlocked)
  const setConnected = useAppStore((s) => s.setConnected)
  const lockForm = useSettingsFormStore((s) => s.lockForm)
  const openPinFlow = useSettingsFormStore((s) => s.openPinFlow)

  return useMutation<{ user?: AkahuUser; needsPinSetup: boolean }, Error, { appToken: string; userToken: string }>({
    mutationFn: async ({
      appToken,
      userToken,
    }: {
      appToken: string
      userToken: string
    }): Promise<{ user?: AkahuUser; needsPinSetup: boolean }> => {
      if (!appToken.trim() || !userToken.trim()) {
        throw new Error("Please enter both your App ID Token and User Access Token.")
      }

      const result = await AkahuAuth.connectWithPersonalTokens(appToken, userToken)
      if (!result.success) {
        throw new Error(result.error || "Could not verify tokens with Akahu.")
      }

      if (result.user) {
        await SecurityManager.storeUserProfile(result.user)
      }

      const hasPin = await SecurityManager.hasPin()
      if (!hasPin) {
        // Mandatory 6-digit PIN setup first, followed by optional biometric uplift
        openPinFlow("setup-pin")
        return { user: result.user, needsPinSetup: true }
      }

      lockForm()
      setConnected(true)
      setSessionUnlocked(true)
      return { user: result.user, needsPinSetup: false }
    },
    onSuccess: async (data): Promise<void> => {
      if (!data.needsPinSetup) {
        await queryClient.invalidateQueries({ queryKey: ["akahu"] })
      }
    },
  })
}

/**
 * Step 2 of initial setup:
 * - Saves the confirmed mandatory 6-digit PIN
 * - Immediately offers Biometric Uplift if the device has biometrics enrolled
 */
export const useCompletePinAndBiometricUplift = (): UseMutationResult<
  { biometricsEnabled: boolean },
  Error,
  string
> => {
  const queryClient = useQueryClient()
  const setSessionUnlocked = useAppStore((s) => s.setSessionUnlocked)
  const setConnected = useAppStore((s) => s.setConnected)
  const lockForm = useSettingsFormStore((s) => s.lockForm)

  return useMutation<{ biometricsEnabled: boolean }, Error, string>({
    mutationFn: async (confirmedPin: string): Promise<{ biometricsEnabled: boolean }> => {
      await SecurityManager.setPin(confirmedPin)

      let biometricsEnabled = false
      const canUseBio = await SecurityManager.canUseBiometrics()
      if (canUseBio) {
        const uplift = await SecurityManager.enableBiometricAuth(
          "Enable biometrics for faster unlock (your 6-digit PIN remains your backup)",
        )
        biometricsEnabled = uplift.success
      }

      lockForm()
      setConnected(true)
      setSessionUnlocked(true)
      return { biometricsEnabled }
    },
    onSuccess: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ["akahu"] })
    },
  })
}

/**
 * Enables or disables the optional Biometrics shortcut without wiping stored tokens
 * (the mandatory 6-digit PIN stays active as the primary fallback).
 */
export const useToggleBiometrics = (): UseMutationResult<boolean, Error, boolean> => {
  const queryClient = useQueryClient()
  const openPinFlow = useSettingsFormStore((s) => s.openPinFlow)

  return useMutation<boolean, Error, boolean>({
    mutationFn: async (enable: boolean): Promise<boolean> => {
      if (enable) {
        const result = await SecurityManager.enableBiometricAuth("Authenticate to enable Biometric Unlock")
        if (!result.success) {
          throw new Error(result.error || "Could not enable biometric unlock.")
        }
        return true
      }

      // Turning biometrics OFF: try biometric confirmation first, or fall back to 6-digit PIN
      const auth = await SecurityManager.promptBiometric("Authenticate to turn off Biometric Unlock")
      if (auth.success) {
        await SecurityManager.setBiometricEnabled(false)
        return false
      }

      openPinFlow("verify-disable-bio")
      throw new Error("Enter your 6-digit PIN to turn off Biometric Unlock.")
    },
    onSuccess: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ["akahu", "stored-settings"] })
    },
  })
}

export const useVerifyPinToDisableBiometrics = (): UseMutationResult<boolean, Error, string> => {
  const queryClient = useQueryClient()
  const closePinFlow = useSettingsFormStore((s) => s.closePinFlow)
  const setPinError = useSettingsFormStore((s) => s.setPinError)

  return useMutation<boolean, Error, string>({
    mutationFn: async (pin: string): Promise<boolean> => {
      const valid = await SecurityManager.verifyPin(pin)
      if (!valid) {
        setPinError("Incorrect 6-digit PIN. Please try again.")
        throw new Error("Incorrect 6-digit PIN.")
      }
      await SecurityManager.setBiometricEnabled(false)
      closePinFlow()
      return true
    },
    onSuccess: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ["akahu", "stored-settings"] })
    },
  })
}

const mapRawAccountToBankAccount = (account: AkahuRawAccount): BankAccount => ({
  id: account._id,
  connectionId: account.connection?._id || account._connection,
  name: account.name,
  bank: account.connection?.name || "NZ Bank",
  accountNumber: account.formatted_account || "••••",
  balance: account.balance?.current ?? 0,
  availableBalance: account.balance?.available,
  type: mapAkahuAccountType(account.type),
  status: account.status,
  lastRefreshed: account.refreshed?.balance || account.refreshed?.transactions,
})

const persistAccountsAndConnections = async (rawAccounts: AkahuRawAccount[]): Promise<void> => {
  const accounts: BankAccount[] = rawAccounts.map(mapRawAccountToBankAccount)
  await upsertAccountsToDb(accounts)

  const connectionsMap = new Map<string, Pick<BankConnection, "id" | "name" | "logoUrl">>()
  for (const raw of rawAccounts) {
    const connId = raw.connection?._id || raw._connection
    if (connId && !connectionsMap.has(connId)) {
      connectionsMap.set(connId, {
        id: connId,
        name: raw.connection?.name || "NZ Bank",
        logoUrl: raw.connection?.logo,
      })
    }
  }

  if (connectionsMap.size > 0) {
    await upsertConnectionsToDb(Array.from(connectionsMap.values()))
    await syncConnectionBranding()
  }
}

export const useWipeAkahuTokens = (): UseMutationResult<boolean, Error, void> => {
  const queryClient = useQueryClient()
  const setSessionUnlocked = useAppStore((s) => s.setSessionUnlocked)
  const setConnected = useAppStore((s) => s.setConnected)
  const resetForm = useSettingsFormStore((s) => s.resetForm)

  return useMutation<boolean, Error, void>({
    mutationFn: async (): Promise<boolean> => {
      await SecurityManager.clearAllSecureData()
      await clearAccountsDb()
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
  const queryClient = useQueryClient()

  return useQuery<BankAccount[], Error>({
    queryKey: ["akahu", "accounts"],
    queryFn: async (): Promise<BankAccount[]> => {
      try {
        const response = await akahuClient.getAccounts()
        await persistAccountsAndConnections(response.items || [])
        await queryClient.invalidateQueries({ queryKey: ["akahu", "connections"] })
        await queryClient.invalidateQueries({ queryKey: ["akahu", "connection-brand"] })
        return await getCachedAccountsFromDb()
      } catch (error) {
        const cached = await getCachedAccountsFromDb()
        if (cached.length > 0) {
          return cached
        }
        throw error
      }
    },
    enabled: !!connection?.connected,
  })
}

export const useAkahuConnectionsMap = (): UseQueryResult<Record<string, BankConnection>, Error> => {
  const { data: connection } = useAkahuConnection()

  return useQuery<Record<string, BankConnection>, Error>({
    queryKey: ["akahu", "connections"],
    queryFn: async (): Promise<Record<string, BankConnection>> => {
      const list = await getCachedConnectionsFromDb()
      const map: Record<string, BankConnection> = {}
      for (const item of list) {
        map[item.id] = item
      }
      return map
    },
    enabled: !!connection?.connected,
  })
}

export const useAkahuConnectionById = (connectionId?: string): UseQueryResult<BankConnection | null, Error> => {
  const { data: connection } = useAkahuConnection()

  return useQuery<BankConnection | null, Error>({
    queryKey: ["akahu", "connection-brand", connectionId],
    queryFn: async (): Promise<BankConnection | null> => {
      if (!connectionId) return null
      return await getCachedConnectionByIdFromDb(connectionId)
    },
    enabled: Boolean(connectionId) && !!connection?.connected,
  })
}

export const useAkahuAccountById = (accountId?: string): UseQueryResult<BankAccount | null, Error> => {
  const { data: connection } = useAkahuConnection()

  return useQuery<BankAccount | null, Error>({
    queryKey: ["akahu", "account", accountId],
    queryFn: async (): Promise<BankAccount | null> => {
      if (!accountId) return null

      const cached = await getCachedAccountByIdFromDb(accountId)
      if (cached) {
        return cached
      }

      const response = await akahuClient.getAccountById(accountId)
      if (!response?.item) return null
      return mapRawAccountToBankAccount(response.item)
    },
    enabled: Boolean(accountId) && !!connection?.connected,
  })
}

export const useRefreshAkahu = (): UseMutationResult<{ success: boolean }, Error, string | undefined> => {
  const queryClient = useQueryClient()

  return useMutation<{ success: boolean }, Error, string | undefined>({
    mutationFn: async (accountOrConnectionId?: string): Promise<{ success: boolean }> => {
      const refreshResult = await akahuClient.refreshAccounts(accountOrConnectionId)
      const response = await akahuClient.getAccounts()
      await clearConnectionBrandColors()
      await persistAccountsAndConnections(response.items || [])
      return refreshResult
    },
    onSuccess: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ["akahu", "accounts"] })
      await queryClient.invalidateQueries({ queryKey: ["akahu", "account"] })
      await queryClient.invalidateQueries({ queryKey: ["akahu", "connections"] })
      await queryClient.invalidateQueries({ queryKey: ["akahu", "connection-brand"] })
    },
  })
}
