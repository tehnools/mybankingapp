import { AppState, type AppStateStatus } from "react-native"
import { create } from "zustand"
import type { AppStoreState, SettingsFormState } from "../types"

export const useAppStore = create<AppStoreState>((set) => ({
  accounts: [],
  transactions: [],
  isConnected: false,
  isSessionUnlocked: false,
  setAccounts: (accounts) => set({ accounts }),
  setTransactions: (transactions) => set({ transactions }),
  setConnected: (connected) => set({ isConnected: connected }),
  setSessionUnlocked: (unlocked) => set({ isSessionUnlocked: unlocked }),
}))

export const useSettingsFormStore = create<SettingsFormState>((set) => ({
  draftAppToken: "",
  draftUserToken: "",
  showUserToken: false,
  isUnlockedForEditing: false,
  showWipeModal: false,
  setDraftAppToken: (draftAppToken) => set({ draftAppToken }),
  setDraftUserToken: (draftUserToken) => set({ draftUserToken }),
  toggleShowUserToken: () => set((s) => ({ showUserToken: !s.showUserToken })),
  unlockFormWithTokens: (draftAppToken, draftUserToken) =>
    set({
      draftAppToken,
      draftUserToken,
      isUnlockedForEditing: true,
    }),
  lockForm: () =>
    set({
      isUnlockedForEditing: false,
      showUserToken: false,
    }),
  resetForm: () =>
    set({
      draftAppToken: "",
      draftUserToken: "",
      showUserToken: false,
      isUnlockedForEditing: false,
      showWipeModal: false,
    }),
  setShowWipeModal: (showWipeModal) => set({ showWipeModal }),
}))

// Automatically lock the session and credential form whenever the app is closed or sent to the background
AppState.addEventListener("change", (nextState: AppStateStatus) => {
  if (nextState === "background") {
    useAppStore.getState().setSessionUnlocked(false)
    useSettingsFormStore.getState().lockForm()
  }
})
