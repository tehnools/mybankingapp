import { useAkahuStoredSettings } from "./use-akahu-data"
import { useAppStore } from "../lib/store"
import type { AppLifecycleState } from "../types"

export const useAppLifecycleState = (): AppLifecycleState => {
  const { data: storedSettings, isLoading } = useAkahuStoredSettings()
  const appState = useAppStore((s) => s.appState)
  const previousAppState = useAppStore((s) => s.previousAppState)
  const isReturningFromBackground = useAppStore((s) => s.isReturningFromBackground)
  const isSessionUnlocked = useAppStore((s) => s.isSessionUnlocked)

  const isForeground = appState === "active"
  const isBackground = appState === "background"
  const hasPin = Boolean(storedSettings?.hasPin)
  const biometricEnabled = Boolean(storedSettings?.biometricEnabled)
  const requiresUnlock = Boolean(storedSettings?.hasStoredTokens && hasPin && !isSessionUnlocked)

  return {
    appState,
    previousAppState,
    isForeground,
    isBackground,
    isReturningFromBackground,
    isSessionUnlocked,
    requiresUnlock,
    biometricEnabled,
    hasPin,
    isLoading,
  }
}
