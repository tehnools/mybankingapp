import { useQuery } from "@tanstack/react-query"
import { akahuClient } from "../lib/akahu-client"
import type { BankAccount, Transaction } from "../lib/store"

export function useAkahuAccounts() {
  return useQuery({
    queryKey: ["akahu", "accounts"],
    queryFn: async () => {
      const response = await akahuClient.getAccounts()

      // Transform Akahu account data to our format
      const accounts: BankAccount[] =
        response.items?.map((account: any) => ({
          id: account._id,
          name: account.name,
          bank: account.connection.name,
          accountNumber: account.formatted_account,
          balance: account.balance?.current || 0,
          type: account.type === "CREDIT_CARD" ? "credit" : account.type === "SAVINGS" ? "savings" : "checking",
        })) || []

      return accounts
    },
    enabled: false, // Only run when explicitly called
  })
}

export function useAkahuTransactions(accountId?: string, days = 30) {
  return useQuery({
    queryKey: ["akahu", "transactions", accountId, days],
    queryFn: async () => {
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      const response = await akahuClient.getTransactions(accountId, {
        start: startDate.toISOString().split("T")[0],
        end: endDate.toISOString().split("T")[0],
        size: 100,
      })

      // Transform Akahu transaction data to our format
      const transactions: Transaction[] =
        response.items?.map((transaction: any) => ({
          id: transaction._id,
          accountId: transaction._account,
          amount: Math.abs(transaction.amount),
          description: transaction.description || transaction.merchant?.name || "Unknown",
          category: transaction.category?.groups?.personal_finance?.primary || "Other",
          date: transaction.date,
          type: transaction.amount < 0 ? "debit" : "credit",
        })) || []

      return transactions
    },
    enabled: false, // Only run when explicitly called
  })
}

export function useAkahuConnection() {
  return useQuery({
    queryKey: ["akahu", "connection"],
    queryFn: async () => {
      try {
        const me = await akahuClient.getMe()
        return { connected: true, user: me }
      } catch (error) {
        return { connected: false, user: null }
      }
    },
    retry: false,
  })
}
