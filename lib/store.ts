import { create } from "zustand"

export interface BankAccount {
  id: string
  name: string
  bank: string
  accountNumber: string
  balance: number
  type: "checking" | "savings" | "credit"
}

export interface Transaction {
  id: string
  accountId: string
  amount: number
  description: string
  category: string
  date: string
  type: "debit" | "credit"
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
