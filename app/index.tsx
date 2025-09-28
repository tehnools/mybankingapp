"use client"

import React from "react"
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import ConnectBankButton from "../components/connect-bank-button"
import { useAkahuConnection } from "../hooks/use-akahu-data"
import { useAuthStore } from "../store/use-auth-store"

export default function HomeScreen() {
  const { data: connectionStatus } = useAkahuConnection()
  const { updateActivity } = useAuthStore()

  React.useEffect(() => {
    updateActivity()
  }, [updateActivity])

  const quickActions = [
    {
      title: "View Accounts",
      subtitle: "Check all your bank accounts",
      icon: "card-outline" as const,
      route: "/accounts",
      color: "#3b82f6",
    },
    {
      title: "Recent Transactions",
      subtitle: "See your latest spending",
      icon: "list-outline" as const,
      route: "/transactions",
      color: "#10b981",
    },
    {
      title: "Financial Insights",
      subtitle: "Analyze your spending patterns",
      icon: "analytics-outline" as const,
      route: "/insights",
      color: "#f59e0b",
    },
    {
      title: "Settings",
      subtitle: "Manage security and preferences",
      icon: "settings-outline" as const,
      route: "/settings",
      color: "#64748b",
    },
  ]

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.welcomeText}>Welcome back!</Text>
          <Text style={styles.subtitle}>Manage all your NZ bank accounts in one place</Text>
        </View>

        {/* Balance Overview Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <Text style={styles.balanceAmount}>$12,450.75</Text>
          <Text style={styles.balanceSubtext}>Across 3 accounts</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          {quickActions.map((action, index) => (
            <TouchableOpacity key={index} style={styles.actionCard} onPress={() => router.push(action.route)}>
              <View style={[styles.actionIcon, { backgroundColor: action.color }]}>
                <Ionicons name={action.icon} size={24} color="white" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Connect Banks Section */}
        <View style={styles.connectSection}>
          <Text style={styles.sectionTitle}>Connect Your Banks</Text>
          {connectionStatus?.connected ? (
            <View style={styles.connectedStatus}>
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              <Text style={styles.connectedText}>Banks Connected</Text>
            </View>
          ) : (
            <ConnectBankButton />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
    lineHeight: 24,
  },
  balanceCard: {
    backgroundColor: "#1a365d",
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    alignItems: "center",
  },
  balanceLabel: {
    fontSize: 14,
    color: "#94a3b8",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 4,
  },
  balanceSubtext: {
    fontSize: 14,
    color: "#94a3b8",
  },
  actionsContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 16,
  },
  actionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 14,
    color: "#64748b",
  },
  connectSection: {
    marginTop: 16,
  },
  connectButton: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
  },
  connectButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3b82f6",
    marginLeft: 8,
  },
  connectedStatus: {
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  connectedText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#059669",
    marginLeft: 8,
  },
})
