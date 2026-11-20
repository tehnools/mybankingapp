import { useAkahuStoredSettings } from "./use-akahu-data"
import { useAppStore } from "../lib/store"
import type { AppLifecycleState } from "../types"

/**
 * Custom hook tracking Android & iOS foreground/background transitions and cold-start lock state.
 * - Moving between background and foreground keeps `isSessionUnlocked = true` (no re-prompt).
 * - Full app close & reopen resets memory, starting with `isSessionUnlocked = false` and requiring unlock
 *   via Biometrics (if enabled) or the mandatory 6-digit PIN fallback.
 */
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

  // Require unlock on cold launch whenever tokens & mandatory 6-digit PIN are stored
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
