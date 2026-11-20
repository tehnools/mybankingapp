import type { AppStateStatus } from "react-native"

export interface BankAccount {
  id: string
  name: string
  bank: string
  accountNumber: string
  balance: number
  availableBalance?: number
  type: "checking" | "savings" | "credit" | "investment" | "kiwisaver" | "loan"
  status?: "ACTIVE" | "INACTIVE"
  lastRefreshed?: string
}

export interface BankAccountDbRow {
  id: string
  name: string
  bank: string
  account_number: string
  balance: number
  available_balance: number | null
  type: BankAccount["type"]
  status: "ACTIVE" | "INACTIVE" | null
  last_refreshed: string | null
  updated_at: number
}

export interface Transaction {
  id: string
  accountId: string
  amount: number
  description: string
  merchantName?: string
  category: string
  date: string
  type: "debit" | "credit"
  rawType?: string
  meta?: {
    particulars?: string
    code?: string
    reference?: string
    other_account?: string
    card_suffix?: string
  }
}

export interface AppStoreState {
  accounts: BankAccount[]
  transactions: Transaction[]
  selectedAccountId: string | null
  isConnected: boolean
  isSessionUnlocked: boolean
  appState: AppStateStatus
  previousAppState: AppStateStatus | null
  isReturningFromBackground: boolean
  setAccounts: (accounts: BankAccount[]) => void
  setTransactions: (transactions: Transaction[]) => void
  setSelectedAccountId: (accountId: string | null) => void
  setConnected: (connected: boolean) => void
  setSessionUnlocked: (unlocked: boolean) => void
  setAppStateTransition: (nextState: AppStateStatus) => void
}

export type PinFlowMode = "closed" | "setup-pin" | "confirm-pin" | "verify-edit" | "verify-disable-bio"

export interface SettingsFormState {
  draftAppToken: string
  draftUserToken: string
  showUserToken: boolean
  isUnlockedForEditing: boolean
  showWipeModal: boolean
  pinFlowMode: PinFlowMode
  pinInput: string
  firstPinEntry: string
  pinError: string | null
  setDraftAppToken: (value: string) => void
  setDraftUserToken: (value: string) => void
  toggleShowUserToken: () => void
  unlockFormWithTokens: (appToken: string, userToken: string) => void
  lockForm: () => void
  resetForm: () => void
  setShowWipeModal: (visible: boolean) => void
  openPinFlow: (mode: Exclude<PinFlowMode, "closed">) => void
  closePinFlow: () => void
  setPinInput: (pin: string) => void
  advanceToConfirmPin: (firstPin: string) => void
  setPinError: (error: string | null) => void
}

export interface LockScreenState {
  pinInput: string
  setPinInput: (pin: string) => void
  clearPinInput: () => void
}

export interface AppLifecycleState {
  appState: AppStateStatus
  previousAppState: AppStateStatus | null
  isForeground: boolean
  isBackground: boolean
  isReturningFromBackground: boolean
  isSessionUnlocked: boolean
  requiresUnlock: boolean
  biometricEnabled: boolean
  hasPin: boolean
  isLoading: boolean
}
