import { create } from "zustand"

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

interface AppState {
  accounts: BankAccount[]
  transactions: Transaction[]
  isConnected: boolean
  setAccounts: (accounts: BankAccount[]) => void
  setTransactions: (transactions: Transaction[]) => void
  setConnected: (connected: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  accounts: [],
  transactions: [],
  isConnected: false,
  setAccounts: (accounts) => set({ accounts }),
  setTransactions: (transactions) => set({ transactions }),
  setConnected: (connected) => set({ isConnected: connected }),
}))
