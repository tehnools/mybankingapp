"use client"

import React, { useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useAkahuTransactions, useAkahuConnection } from "../hooks/use-akahu-data"
import type { Transaction } from "../lib/store"

const CATEGORIES = [
  "All",
  "Food & Dining",
  "Shopping",
  "Transport",
  "Bills & Utilities",
  "Entertainment",
  "Health",
  "Other",
]

const TRANSACTION_TYPES = ["All", "Income", "Expenses"]

export default function TransactionsScreen() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [selectedType, setSelectedType] = useState("All")
  const [timeRange, setTimeRange] = useState(30)

  const { data: connectionStatus } = useAkahuConnection()
  const { data: transactions, isLoading, refetch } = useAkahuTransactions(undefined, timeRange)

  React.useEffect(() => {
    if (connectionStatus?.connected) {
      refetch()
    }
  }, [connectionStatus?.connected, refetch])

  // Mock transactions for demo
  const mockTransactions: Transaction[] = [
    {
      id: "1",
      accountId: "acc1",
      amount: 45.5,
      description: "Countdown Supermarket",
      category: "Food & Dining",
      date: "2024-01-15",
      type: "debit",
    },
    {
      id: "2",
      accountId: "acc2",
      amount: 2500.0,
      description: "Salary Payment",
      category: "Income",
      date: "2024-01-14",
      type: "credit",
    },
    {
      id: "3",
      accountId: "acc1",
      amount: 89.99,
      description: "Spark Mobile",
      category: "Bills & Utilities",
      date: "2024-01-13",
      type: "debit",
    },
    {
      id: "4",
      accountId: "acc3",
      amount: 25.0,
      description: "Netflix Subscription",
      category: "Entertainment",
      date: "2024-01-12",
      type: "debit",
    },
    {
      id: "5",
      accountId: "acc1",
      amount: 156.75,
      description: "Pak'nSave Groceries",
      category: "Food & Dining",
      date: "2024-01-11",
      type: "debit",
    },
  ]

  const allTransactions = transactions || mockTransactions

  // Filter transactions
  const filteredTransactions = allTransactions.filter((transaction) => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "All" || transaction.category === selectedCategory
    const matchesType =
      selectedType === "All" ||
      (selectedType === "Income" && transaction.type === "credit") ||
      (selectedType === "Expenses" && transaction.type === "debit")

    return matchesSearch && matchesCategory && matchesType
  })

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

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <TouchableOpacity style={styles.transactionCard}>
      <View style={styles.transactionIcon}>
        <Ionicons name={getCategoryIcon(item.category) as any} size={20} color="#64748b" />
      </View>
      <View style={styles.transactionDetails}>
        <Text style={styles.transactionDescription}>{item.description}</Text>
        <Text style={styles.transactionCategory}>{item.category}</Text>
        <Text style={styles.transactionDate}>{formatDate(item.date)}</Text>
      </View>
      <View style={styles.transactionAmount}>
        <Text style={[styles.amount, item.type === "credit" ? styles.creditAmount : styles.debitAmount]}>
          {formatAmount(item.amount, item.type)}
        </Text>
      </View>
    </TouchableOpacity>
  )

  const renderCategoryFilter = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[styles.filterChip, selectedCategory === item && styles.activeFilterChip]}
      onPress={() => setSelectedCategory(item)}
    >
      <Text style={[styles.filterChipText, selectedCategory === item && styles.activeFilterChipText]}>{item}</Text>
    </TouchableOpacity>
  )

  if (!connectionStatus?.connected) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notConnectedContainer}>
          <Ionicons name="link-outline" size={64} color="#9ca3af" />
          <Text style={styles.notConnectedTitle}>No Bank Accounts Connected</Text>
          <Text style={styles.notConnectedText}>Connect your bank accounts to view transactions</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Transactions</Text>
          <Text style={styles.subtitle}>All your spending in one place</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#9ca3af" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search transactions..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Type Filter */}
        <View style={styles.typeFilterContainer}>
          {TRANSACTION_TYPES.map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.typeFilterButton, selectedType === type && styles.activeTypeFilter]}
              onPress={() => setSelectedType(type)}
            >
              <Text style={[styles.typeFilterText, selectedType === type && styles.activeTypeFilterText]}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Category Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryFilters}>
          <FlatList
            data={CATEGORIES}
            renderItem={renderCategoryFilter}
            keyExtractor={(item) => item}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryFilterContent}
          />
        </ScrollView>

        {/* Transaction Summary */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Expenses</Text>
            <Text style={styles.expenseAmount}>
              -$
              {filteredTransactions
                .filter((t) => t.type === "debit")
                .reduce((sum, t) => sum + t.amount, 0)
                .toLocaleString("en-NZ")}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Income</Text>
            <Text style={styles.incomeAmount}>
              +$
              {filteredTransactions
                .filter((t) => t.type === "credit")
                .reduce((sum, t) => sum + t.amount, 0)
                .toLocaleString("en-NZ")}
            </Text>
          </View>
        </View>

        {/* Transactions List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading transactions...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredTransactions}
            renderItem={renderTransaction}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.transactionsList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="receipt-outline" size={48} color="#9ca3af" />
                <Text style={styles.emptyText}>No transactions found</Text>
                <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1e293b",
  },
  typeFilterContainer: {
    flexDirection: "row",
    marginBottom: 16,
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    padding: 4,
  },
  typeFilterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: "center",
  },
  activeTypeFilter: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  typeFilterText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748b",
  },
  activeTypeFilterText: {
    color: "#1e293b",
    fontWeight: "600",
  },
  categoryFilters: {
    marginBottom: 16,
  },
  categoryFilterContent: {
    paddingRight: 20,
  },
  filterChip: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  activeFilterChip: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  filterChipText: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  activeFilterChipText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  summaryContainer: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#dc2626",
  },
  incomeAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#059669",
  },
  transactionsList: {
    paddingBottom: 20,
  },
  transactionCard: {
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
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 2,
  },
  transactionCategory: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: "#9ca3af",
  },
  transactionAmount: {
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#64748b",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9ca3af",
  },
  notConnectedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  notConnectedTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1e293b",
    marginTop: 16,
    marginBottom: 8,
  },
  notConnectedText: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 24,
  },
})
