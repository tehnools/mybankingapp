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
  isConnected: boolean
  isSessionUnlocked: boolean
  setAccounts: (accounts: BankAccount[]) => void
  setTransactions: (transactions: Transaction[]) => void
  setConnected: (connected: boolean) => void
  setSessionUnlocked: (unlocked: boolean) => void
}

export interface SettingsFormState {
  draftAppToken: string
  draftUserToken: string
  showUserToken: boolean
  isUnlockedForEditing: boolean
  showWipeModal: boolean
  setDraftAppToken: (value: string) => void
  setDraftUserToken: (value: string) => void
  toggleShowUserToken: () => void
  unlockFormWithTokens: (appToken: string, userToken: string) => void
  lockForm: () => void
  resetForm: () => void
  setShowWipeModal: (visible: boolean) => void
}
