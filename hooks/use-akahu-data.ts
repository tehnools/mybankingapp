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
import {
  AkahuClipboardTextTransformSchema,
  transformAkahuAccountsForDb,
  transformAkahuAccountToBankAccount,
  type AkahuClipboardPasteResult,
  type AkahuConnectionStatus,
  type AkahuRawAccount,
  type AkahuStoredSettings,
  type AkahuUser,
  type BankAccount,
  type BankConnection,
} from "../types"

const extractAndPasteTokensFromClipboard = async (): Promise<AkahuClipboardPasteResult> => {
  try {
    await new Promise<void>((resolve) => setTimeout(resolve, 200))
    const rawText = await Clipboard.getStringAsync()
    const extracted = AkahuClipboardTextTransformSchema.parse(rawText)

    const { draftAppToken, draftUserToken, setDraftAppToken, setDraftUserToken } = useSettingsFormStore.getState()

    let pastedAppToken: string | null = null
    let pastedUserToken: string | null = null

    if (extracted.pastedAppToken && extracted.pastedAppToken !== draftAppToken) {
      pastedAppToken = extracted.pastedAppToken
      setDraftAppToken(pastedAppToken)
    }

    if (extracted.pastedUserToken && extracted.pastedUserToken !== draftUserToken) {
      pastedUserToken = extracted.pastedUserToken
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

export const useAkahuStoredSettings = (): UseQueryResult<AkahuStoredSettings, Error> => {
  return useQuery<AkahuStoredSettings, Error>({
    queryKey: ["akahu", "stored-settings"],
    queryFn: async (): Promise<AkahuStoredSettings> => {
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
        if (!me?.item) {
          return { connected: false, user: null }
        }
        return { connected: true, user: me.item }
      } catch {
        return { connected: false, user: null }
      }
    },
    retry: false,
  })
}

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
      const result = await AkahuAuth.connectWithPersonalTokens(appToken, userToken)
      if (!result.success) {
        throw new Error(result.error)
      }

      await SecurityManager.storeUserProfile(result.user)

      const hasPin = await SecurityManager.hasPin()
      if (!hasPin) {
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

export const useToggleBiometrics = (): UseMutationResult<boolean, Error, boolean> => {
  const queryClient = useQueryClient()
  const openPinFlow = useSettingsFormStore((s) => s.openPinFlow)

  return useMutation<boolean, Error, boolean>({
    mutationFn: async (enable: boolean): Promise<boolean> => {
      if (enable) {
        const result = await SecurityManager.enableBiometricAuth("Authenticate to enable Biometric Unlock")
        if (!result.success) {
          throw new Error(result.error)
        }
        return true
      }

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

const persistAccountsAndConnections = async (rawAccounts: AkahuRawAccount[]): Promise<void> => {
  const { accounts, connections } = transformAkahuAccountsForDb(rawAccounts)
  await upsertAccountsToDb(accounts)

  if (connections.length > 0) {
    await upsertConnectionsToDb(connections)
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
      return transformAkahuAccountToBankAccount(response.item)
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
