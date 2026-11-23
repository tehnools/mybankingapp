import { AppState, Platform, type AppStateStatus } from "react-native"
import { create } from "zustand"
import { focusManager } from "@tanstack/react-query"
import type { AppStoreState, LockScreenState, PinFlowMode, SettingsFormState } from "../types"

export const useAppStore = create<AppStoreState>((set) => ({
  accounts: [],
  transactions: [],
  selectedAccountId: null,
  isConnected: false,
  isSessionUnlocked: false,
  appState: (AppState.currentState as AppStateStatus | null) ?? "active",
  previousAppState: null,
  isReturningFromBackground: false,
  setAccounts: (accounts) => set({ accounts }),
  setTransactions: (transactions) => set({ transactions }),
  setSelectedAccountId: (selectedAccountId) => set({ selectedAccountId }),
  setConnected: (connected) => set({ isConnected: connected }),
  setSessionUnlocked: (unlocked) => set({ isSessionUnlocked: unlocked }),
  setAppStateTransition: (nextState: AppStateStatus) =>
    set((state) => {
      const wasBackgrounded =
        Platform.OS === "ios"
          ? state.appState === "background" || state.appState === "inactive"
          : state.appState === "background"

      return {
        previousAppState: state.appState,
        appState: nextState,
        isReturningFromBackground: wasBackgrounded && nextState === "active",
      }
    }),
}))

export const useLockScreenStore = create<LockScreenState>((set) => ({
  pinInput: "",
  setPinInput: (pinInput: string) => set({ pinInput }),
  clearPinInput: () => set({ pinInput: "" }),
}))

export const useSettingsFormStore = create<SettingsFormState>((set) => ({
  draftAppToken: "",
  draftUserToken: "",
  showUserToken: false,
  isUnlockedForEditing: false,
  showWipeModal: false,
  pinFlowMode: "closed",
  pinInput: "",
  firstPinEntry: "",
  pinError: null,
  setDraftAppToken: (draftAppToken: string) => set({ draftAppToken }),
  setDraftUserToken: (draftUserToken: string) => set({ draftUserToken }),
  toggleShowUserToken: () => set((s) => ({ showUserToken: !s.showUserToken })),
  unlockFormWithTokens: (draftAppToken: string, draftUserToken: string) =>
    set({
      draftAppToken,
      draftUserToken,
      isUnlockedForEditing: true,
      pinFlowMode: "closed",
      pinInput: "",
      firstPinEntry: "",
      pinError: null,
    }),
  lockForm: () =>
    set({
      isUnlockedForEditing: false,
      showUserToken: false,
      pinFlowMode: "closed",
      pinInput: "",
      firstPinEntry: "",
      pinError: null,
    }),
  resetForm: () =>
    set({
      draftAppToken: "",
      draftUserToken: "",
      showUserToken: false,
      isUnlockedForEditing: false,
      showWipeModal: false,
      pinFlowMode: "closed",
      pinInput: "",
      firstPinEntry: "",
      pinError: null,
    }),
  setShowWipeModal: (showWipeModal: boolean) => set({ showWipeModal }),
  openPinFlow: (pinFlowMode: Exclude<PinFlowMode, "closed">) =>
    set({
      pinFlowMode,
      pinInput: "",
      firstPinEntry: "",
      pinError: null,
    }),
  closePinFlow: () =>
    set({
      pinFlowMode: "closed",
      pinInput: "",
      firstPinEntry: "",
      pinError: null,
    }),
  setPinInput: (pinInput: string) => set({ pinInput, pinError: null }),
  advanceToConfirmPin: (firstPinEntry: string) =>
    set({
      firstPinEntry,
      pinInput: "",
      pinFlowMode: "confirm-pin",
      pinError: null,
    }),
  setPinError: (pinError: string | null) => set({ pinError, pinInput: "" }),
}))

AppState.addEventListener("change", (nextState: AppStateStatus): void => {
  useAppStore.getState().setAppStateTransition(nextState)
  focusManager.setFocused(nextState === "active")
})
