import React from "react"
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native"
import { router } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { Text } from "../components/app-text"
import { AkahuAuth } from "../lib/akahu-auth"
import { useAppStore } from "../lib/store"
import {
  useAkahuAccountById,
  useAkahuAccounts,
  useAkahuConnection,
  useRefreshAkahu,
} from "../hooks/use-akahu-data"
import type { BankAccount } from "../types"

type IoniconName = React.ComponentProps<typeof Ionicons>["name"]

const getAccountIcon = (type: BankAccount["type"]): IoniconName => {
  switch (type) {
    case "checking":
      return "card-outline"
    case "savings":
      return "wallet-outline"
    case "credit":
      return "card"
    case "kiwisaver":
    case "investment":
      return "trending-up-outline"
    case "loan":
      return "home-outline"
    default:
      return "card-outline"
  }
}

const formatCurrency = (amount: number): string => {
  const isNegative = amount < 0
  const formatted = Math.abs(amount).toLocaleString("en-NZ", {
    style: "currency",
    currency: "NZD",
  })
  return isNegative ? `-${formatted}` : formatted
}

const AccountDetailView = ({
  accountId,
  onBack,
}: {
  accountId: string
  onBack: () => void
}): React.JSX.Element => {
  const { data: account, isLoading } = useAkahuAccountById(accountId)

  if (isLoading) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading account details...</Text>
      </View>
    )
  }

  if (!account) {
    return (
      <View style={styles.centeredContainer}>
        <Ionicons name="alert-circle-outline" size={44} color="#94a3b8" />
        <Text style={styles.emptyTitle}>Account Not Found</Text>
        <TouchableOpacity style={styles.backPillButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={18} color="#3b82f6" />
          <Text style={styles.backPillText}>Back to Accounts</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailScrollContent}>
      {/* Back to Accounts Row */}
      <TouchableOpacity style={styles.backRow} onPress={onBack}>
        <Ionicons name="chevron-back" size={20} color="#3b82f6" />
        <Text style={styles.backRowText} preventOrphans={false}>
          All Bank Accounts
        </Text>
      </TouchableOpacity>

      {/* Net Balance Card for This Bank Account */}
      <View style={styles.netCard}>
        <View style={styles.bankBadgeRow}>
          <View style={styles.bankBadge}>
            <Text style={styles.bankBadgeText} preventOrphans={false}>
              {account.bank}
            </Text>
          </View>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText} preventOrphans={false}>
              {account.type.toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={styles.detailAccountName} preventOrphans={false}>
          {account.name}
        </Text>
        <Text style={styles.detailAccountNumber} preventOrphans={false}>
          {account.accountNumber}
        </Text>

        <View style={styles.netBalanceBox}>
          <Text style={styles.netLabel} preventOrphans={false}>
            Net Account Balance
          </Text>
          <Text
            style={[styles.netAmount, account.balance < 0 && styles.negativeNetAmount]}
            preventOrphans={false}
          >
            {formatCurrency(account.balance)}
          </Text>

          {account.availableBalance !== undefined && (
            <Text style={styles.availableAmount} preventOrphans={false}>
              Available Balance: {formatCurrency(account.availableBalance)}
            </Text>
          )}
        </View>
      </View>

      {/* Reserved Transactions Section (Empty Placeholder for Now) */}
      <View style={styles.transactionsSection}>
        <View style={styles.transactionsHeaderRow}>
          <Text style={styles.sectionTitle} preventOrphans={false}>
            Transactions
          </Text>
          <View style={styles.comingSoonPill}>
            <Text style={styles.comingSoonText} preventOrphans={false}>
              Next Phase
            </Text>
          </View>
        </View>

        <View style={styles.emptyTransactionsBox}>
          <View style={styles.emptyTransactionsIcon}>
            <Ionicons name="receipt-outline" size={32} color="#94a3b8" />
          </View>
          <Text style={styles.emptyTransactionsTitle}>No Transactions Loaded Yet</Text>
          <Text style={styles.emptyTransactionsSubtitle}>
            This space is reserved for {account.name} transactions. Transaction syncing will be plugged in during the
            next phase.
          </Text>
        </View>
      </View>
    </ScrollView>
  )
}

const AccountsScreen = (): React.JSX.Element => {
  const { data: connectionStatus, isLoading: isCheckingConnection } = useAkahuConnection()
  const { data: accounts, isLoading: isLoadingAccounts, refetch, isRefetching, error } = useAkahuAccounts()
  const refreshMutation = useRefreshAkahu()

  const selectedAccountId = useAppStore((s) => s.selectedAccountId)
  const setSelectedAccountId = useAppStore((s) => s.setSelectedAccountId)

  const isConnected = Boolean(connectionStatus?.connected)
  const accountList = accounts || []

  if (selectedAccountId) {
    return (
      <AccountDetailView
        accountId={selectedAccountId}
        onBack={(): void => {
          setSelectedAccountId(null)
        }}
      />
    )
  }

  const handleSync = (): void => {
    refreshMutation.mutate(undefined)
  }

  const handleOpenAccount = (accountId: string): void => {
    setSelectedAccountId(accountId)
  }

  const renderAccountItem = ({ item }: { item: BankAccount }): React.JSX.Element => (
    <TouchableOpacity
      style={styles.accountCard}
      activeOpacity={0.7}
      onPress={(): void => handleOpenAccount(item.id)}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={getAccountIcon(item.type)} size={24} color="#3b82f6" />
      </View>

      <View style={styles.accountDetails}>
        <Text style={styles.accountName} preventOrphans={false}>
          {item.name}
        </Text>
        <Text style={styles.bankSubtext} preventOrphans={false}>
          {item.bank} • {item.accountNumber}
        </Text>
      </View>

      <View style={styles.rightSection}>
        <View style={styles.balanceColumn}>
          <Text style={[styles.balanceText, item.balance < 0 && styles.negativeBalanceText]} preventOrphans={false}>
            {formatCurrency(item.balance)}
          </Text>
          {item.availableBalance !== undefined && item.availableBalance !== item.balance && (
            <Text style={styles.availableText} preventOrphans={false}>
              Avail: {formatCurrency(item.availableBalance)}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.arrowHitBox}
          onPress={(): void => handleOpenAccount(item.id)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-forward" size={22} color="#3b82f6" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  )

  if (isCheckingConnection) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Checking Akahu connection...</Text>
      </View>
    )
  }

  if (!isConnected) {
    return (
      <View style={styles.centeredContainer}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="card-outline" size={36} color="#3b82f6" />
        </View>
        <Text style={styles.emptyTitle}>No Akahu Connection</Text>
        <Text style={styles.emptySubtitle}>
          Add your Akahu App ID Token and User Access Token in the Settings tab to sync and store your NZ bank accounts.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={(): void => router.push("/settings")}>
          <Ionicons name="settings-outline" size={18} color="#ffffff" />
          <Text style={styles.primaryButtonText}>Open Settings</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const errorMessage =
    (refreshMutation.error instanceof Error && refreshMutation.error.message) ||
    (error instanceof Error && error.message) ||
    null

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Your Bank Accounts</Text>
          <Text style={styles.headerSubtitle}>Cached locally in SQLite • Tap an account to view details</Text>
        </View>

        <TouchableOpacity
          style={styles.syncButton}
          onPress={handleSync}
          disabled={refreshMutation.isPending || isRefetching}
        >
          {refreshMutation.isPending || isRefetching ? (
            <ActivityIndicator size="small" color="#3b82f6" />
          ) : (
            <Ionicons name="refresh" size={18} color="#3b82f6" />
          )}
          <Text style={styles.syncButtonText} preventOrphans={false}>
            {refreshMutation.isPending ? "Syncing..." : "Sync"}
          </Text>
        </TouchableOpacity>
      </View>

      {errorMessage && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={18} color="#dc2626" />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {isLoadingAccounts && accountList.length === 0 ? (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>Loading your NZ bank accounts...</Text>
        </View>
      ) : (
        <FlatList
          data={accountList}
          keyExtractor={(item: BankAccount): string => item.id}
          renderItem={renderAccountItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={isRefetching}
          onRefresh={(): void => {
            refetch()
          }}
          ListEmptyComponent={
            <View style={styles.emptyListBox}>
              <Ionicons name="wallet-outline" size={44} color="#94a3b8" />
              <Text style={styles.emptyTitle}>No Accounts Found</Text>
              <Text style={styles.emptySubtitle}>
                Link your NZ bank accounts on Akahu and tap Sync to pull them into the app.
              </Text>
            </View>
          }
          ListFooterComponent={
            <TouchableOpacity
              style={styles.linkBankButton}
              onPress={(): void => {
                AkahuAuth.openAkahuAccountSetup()
              }}
            >
              <Ionicons name="add-circle-outline" size={20} color="#3b82f6" />
              <Text style={styles.linkBankButtonText}>Add / Manage Bank Accounts on Akahu</Text>
            </TouchableOpacity>
          }
        />
      )}
    </View>
  )
}

export default AccountsScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  centeredContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    padding: 28,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#64748b",
  },
  syncButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    marginLeft: 12,
  },
  syncButtonText: {
    color: "#3b82f6",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  listContent: {
    paddingBottom: 32,
  },
  accountCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  accountDetails: {
    flex: 1,
    paddingRight: 8,
  },
  accountName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 3,
  },
  bankSubtext: {
    fontSize: 13,
    color: "#64748b",
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  balanceColumn: {
    alignItems: "flex-end",
  },
  balanceText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#059669",
  },
  negativeBalanceText: {
    color: "#dc2626",
  },
  availableText: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  arrowHitBox: {
    marginLeft: 10,
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyListBox: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#1e293b",
    marginTop: 12,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 22,
  },
  primaryButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 8,
  },
  linkBankButton: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    marginTop: 6,
  },
  linkBankButtonText: {
    color: "#3b82f6",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 8,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    color: "#64748b",
  },
  detailScroll: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  detailScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  backPillButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backPillText: {
    color: "#3b82f6",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: 14,
    paddingVertical: 4,
  },
  backRowText: {
    color: "#3b82f6",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 4,
  },
  netCard: {
    backgroundColor: "#1a365d",
    borderRadius: 18,
    padding: 22,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  bankBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  bankBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  bankBadgeText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  typeBadge: {
    backgroundColor: "rgba(59, 130, 246, 0.35)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: {
    color: "#bfdbfe",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  detailAccountName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 4,
  },
  detailAccountNumber: {
    fontSize: 14,
    color: "#94a3b8",
    marginBottom: 20,
  },
  netBalanceBox: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.12)",
    paddingTop: 16,
  },
  netLabel: {
    fontSize: 12,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  netAmount: {
    fontSize: 34,
    fontWeight: "800",
    color: "#ffffff",
  },
  negativeNetAmount: {
    color: "#fca5a5",
  },
  availableAmount: {
    fontSize: 13,
    color: "#cbd5e1",
    marginTop: 6,
  },
  transactionsSection: {
    flex: 1,
  },
  transactionsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#1e293b",
  },
  comingSoonPill: {
    backgroundColor: "#e2e8f0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  comingSoonText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  emptyTransactionsBox: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
  },
  emptyTransactionsIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  emptyTransactionsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
    textAlign: "center",
  },
  emptyTransactionsSubtitle: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
  },
})
