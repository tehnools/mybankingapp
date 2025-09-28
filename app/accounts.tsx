"use client"

import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useAppStore } from "../lib/store"
import { useAkahuAccounts, useAkahuConnection } from "../hooks/use-akahu-data"
import ConnectBankButton from "../components/connect-bank-button"
import React from "react"

export default function AccountsScreen() {
  const { accounts } = useAppStore()
  const { data: connectionStatus } = useAkahuConnection()
  const { data: akahuAccounts, isLoading, refetch } = useAkahuAccounts()

  React.useEffect(() => {
    if (connectionStatus?.connected) {
      refetch()
    }
  }, [connectionStatus?.connected, refetch])

  const mockAccounts = [
    {
      id: "1",
      name: "Everyday Account",
      bank: "ANZ",
      accountNumber: "****1234",
      balance: 5420.5,
      type: "checking" as const,
    },
    {
      id: "2",
      name: "Savings Account",
      bank: "ASB",
      accountNumber: "****5678",
      balance: 12450.75,
      type: "savings" as const,
    },
    {
      id: "3",
      name: "Credit Card",
      bank: "BNZ",
      accountNumber: "****9012",
      balance: -1420.25,
      type: "credit" as const,
    },
  ]

  const getAccountIcon = (type: string) => {
    switch (type) {
      case "checking":
        return "card-outline"
      case "savings":
        return "wallet-outline"
      case "credit":
        return "card"
      default:
        return "card-outline"
    }
  }

  const formatBalance = (balance: number) => {
    const isNegative = balance < 0
    const formatted = Math.abs(balance).toLocaleString("en-NZ", {
      style: "currency",
      currency: "NZD",
    })
    return isNegative ? `-${formatted}` : formatted
  }

  const renderAccount = ({ item }: { item: (typeof mockAccounts)[0] }) => (
    <TouchableOpacity style={styles.accountCard}>
      <View style={styles.accountHeader}>
        <View style={styles.accountInfo}>
          <View style={styles.iconContainer}>
            <Ionicons name={getAccountIcon(item.type) as any} size={24} color="#3b82f6" />
          </View>
          <View style={styles.accountDetails}>
            <Text style={styles.accountName}>{item.name}</Text>
            <Text style={styles.bankName}>
              {item.bank} • {item.accountNumber}
            </Text>
          </View>
        </View>
        <View style={styles.balanceContainer}>
          <Text style={[styles.balance, item.balance < 0 && styles.negativeBalance]}>
            {formatBalance(item.balance)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Your Bank Accounts</Text>
        <Text style={styles.subtitle}>Connected accounts from New Zealand banks</Text>

        {!connectionStatus?.connected ? (
          <View style={styles.notConnectedContainer}>
            <Text style={styles.notConnectedText}>Connect your bank accounts to get started</Text>
            <ConnectBankButton style={styles.connectButton} />
          </View>
        ) : isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading your accounts...</Text>
          </View>
        ) : (
          <>
            <FlatList
              data={akahuAccounts || mockAccounts}
              renderItem={renderAccount}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContainer}
              showsVerticalScrollIndicator={false}
            />

            <ConnectBankButton style={styles.addButton} />
          </>
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
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
    marginBottom: 24,
  },
  listContainer: {
    paddingBottom: 100,
  },
  accountCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  accountHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  accountInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  accountDetails: {
    flex: 1,
  },
  accountName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 4,
  },
  bankName: {
    fontSize: 14,
    color: "#64748b",
  },
  balanceContainer: {
    alignItems: "flex-end",
  },
  balance: {
    fontSize: 20,
    fontWeight: "700",
    color: "#059669",
  },
  negativeBalance: {
    color: "#dc2626",
  },
  addButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
  },
  addButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  notConnectedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  notConnectedText: {
    fontSize: 18,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 26,
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
  connectButton: {
    width: "100%",
  },
})
