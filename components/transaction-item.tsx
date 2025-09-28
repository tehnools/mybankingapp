import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import type { Transaction } from "../lib/store"

interface TransactionItemProps {
  transaction: Transaction
  onPress?: () => void
}

export default function TransactionItem({ transaction, onPress }: TransactionItemProps) {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Food & Dining":
        return "restaurant-outline"
      case "Shopping":
        return "bag-outline"
      case "Transport":
        return "car-outline"
      case "Bills & Utilities":
        return "receipt-outline"
      case "Entertainment":
        return "game-controller-outline"
      case "Health":
        return "medical-outline"
      case "Income":
        return "trending-up-outline"
      default:
        return "ellipse-outline"
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Food & Dining":
        return "#f59e0b"
      case "Shopping":
        return "#8b5cf6"
      case "Transport":
        return "#06b6d4"
      case "Bills & Utilities":
        return "#ef4444"
      case "Entertainment":
        return "#ec4899"
      case "Health":
        return "#10b981"
      case "Income":
        return "#059669"
      default:
        return "#64748b"
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return "Today"
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday"
    } else {
      return date.toLocaleDateString("en-NZ", {
        day: "numeric",
        month: "short",
      })
    }
  }

  const formatAmount = (amount: number, type: "debit" | "credit") => {
    const formatted = amount.toLocaleString("en-NZ", {
      style: "currency",
      currency: "NZD",
    })
    return type === "debit" ? `-${formatted}` : `+${formatted}`
  }

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={[styles.iconContainer, { backgroundColor: `${getCategoryColor(transaction.category)}15` }]}>
        <Ionicons
          name={getCategoryIcon(transaction.category) as any}
          size={20}
          color={getCategoryColor(transaction.category)}
        />
      </View>
      <View style={styles.details}>
        <Text style={styles.description} numberOfLines={1}>
          {transaction.description}
        </Text>
        <Text style={styles.category}>{transaction.category}</Text>
        <Text style={styles.date}>{formatDate(transaction.date)}</Text>
      </View>
      <View style={styles.amountContainer}>
        <Text style={[styles.amount, transaction.type === "credit" ? styles.creditAmount : styles.debitAmount]}>
          {formatAmount(transaction.amount, transaction.type)}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  details: {
    flex: 1,
  },
  description: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 2,
  },
  category: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
    color: "#9ca3af",
  },
  amountContainer: {
    alignItems: "flex-end",
  },
  amount: {
    fontSize: 16,
    fontWeight: "700",
  },
  creditAmount: {
    color: "#059669",
  },
  debitAmount: {
    color: "#dc2626",
  },
})
