import type { Transaction } from "./store"

export const TRANSACTION_CATEGORIES = [
  "Food & Dining",
  "Shopping",
  "Transport",
  "Bills & Utilities",
  "Entertainment",
  "Health",
  "Income",
  "Other",
] as const

export type TransactionCategory = (typeof TRANSACTION_CATEGORIES)[number]

export function categorizeTransaction(description: string): TransactionCategory {
  const desc = description.toLowerCase()

  // Food & Dining
  if (
    desc.includes("countdown") ||
    desc.includes("pak'nsave") ||
    desc.includes("new world") ||
    desc.includes("restaurant") ||
    desc.includes("cafe") ||
    desc.includes("mcdonald") ||
    desc.includes("kfc") ||
    desc.includes("subway") ||
    desc.includes("uber eats") ||
    desc.includes("menulog")
  ) {
    return "Food & Dining"
  }

  // Transport
  if (
    desc.includes("bp") ||
    desc.includes("z energy") ||
    desc.includes("mobil") ||
    desc.includes("at hop") ||
    desc.includes("uber") ||
    desc.includes("taxi") ||
    desc.includes("parking")
  ) {
    return "Transport"
  }

  // Bills & Utilities
  if (
    desc.includes("spark") ||
    desc.includes("vodafone") ||
    desc.includes("2degrees") ||
    desc.includes("mercury") ||
    desc.includes("contact energy") ||
    desc.includes("genesis") ||
    desc.includes("meridian") ||
    desc.includes("electricity") ||
    desc.includes("gas") ||
    desc.includes("water") ||
    desc.includes("internet")
  ) {
    return "Bills & Utilities"
  }

  // Entertainment
  if (
    desc.includes("netflix") ||
    desc.includes("spotify") ||
    desc.includes("disney") ||
    desc.includes("amazon prime") ||
    desc.includes("cinema") ||
    desc.includes("movie") ||
    desc.includes("gym") ||
    desc.includes("fitness")
  ) {
    return "Entertainment"
  }

  // Shopping
  if (
    desc.includes("warehouse") ||
    desc.includes("kmart") ||
    desc.includes("farmers") ||
    desc.includes("amazon") ||
    desc.includes("trademe") ||
    desc.includes("clothing") ||
    desc.includes("shop")
  ) {
    return "Shopping"
  }

  // Health
  if (desc.includes("pharmacy") || desc.includes("doctor") || desc.includes("medical") || desc.includes("health")) {
    return "Health"
  }

  // Income
  if (
    desc.includes("salary") ||
    desc.includes("wage") ||
    desc.includes("payment received") ||
    desc.includes("transfer in")
  ) {
    return "Income"
  }

  return "Other"
}

export function groupTransactionsByDate(transactions: Transaction[]) {
  const grouped = transactions.reduce(
    (groups, transaction) => {
      const date = transaction.date
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(transaction)
      return groups
    },
    {} as Record<string, Transaction[]>,
  )

  return Object.entries(grouped)
    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
    .map(([date, transactions]) => ({
      date,
      transactions: transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    }))
}

export function calculateTransactionSummary(transactions: Transaction[]) {
  const totalIncome = transactions.filter((t) => t.type === "credit").reduce((sum, t) => sum + t.amount, 0)

  const totalExpenses = transactions.filter((t) => t.type === "debit").reduce((sum, t) => sum + t.amount, 0)

  const netAmount = totalIncome - totalExpenses

  const categoryBreakdown = transactions
    .filter((t) => t.type === "debit")
    .reduce(
      (breakdown, transaction) => {
        const category = transaction.category
        breakdown[category] = (breakdown[category] || 0) + transaction.amount
        return breakdown
      },
      {} as Record<string, number>,
    )

  return {
    totalIncome,
    totalExpenses,
    netAmount,
    categoryBreakdown,
  }
}
