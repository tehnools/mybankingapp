import React from "react"
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image } from "react-native"
import { router } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { Text } from "../components/app-text"
import { AkahuAuth } from "../lib/akahu-auth"
import { getFallbackBankColor, getReadableTextColor } from "../lib/bank-branding"
import { useAppStore } from "../lib/store"
import { useAppTheme } from "../lib/theme"
import {
  useAccountTransactionsSync,
  useAkahuAccountById,
  useAkahuAccounts,
  useAkahuConnection,
  useAkahuConnectionById,
  useAkahuConnectionsMap,
  useBackfillHistoricalTransactions,
  useBackgroundTransactionsSync,
  useInfiniteAccountTransactions,
  useRefreshAkahu,
} from "../hooks/use-akahu-data"
import type { BankAccount, Transaction } from "../types"

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

const getTransactionIcon = (transaction: Transaction): IoniconName => {
  const raw = (transaction.rawType || transaction.category).toUpperCase()
  if (raw.includes("TRANSFER")) return "swap-horizontal-outline"
  if (raw.includes("EFTPOS") || raw.includes("CARD")) return "card-outline"
  if (raw.includes("ATM")) return "cash-outline"
  if (raw.includes("FEE") || raw.includes("TAX")) return "receipt-outline"
  if (raw.includes("INTEREST") || transaction.type === "credit") return "arrow-down-outline"
  return "bag-handle-outline"
}

const formatCurrency = (amount: number): string => {
  const isNegative = amount < 0
  const formatted = Math.abs(amount).toLocaleString("en-NZ", {
    style: "currency",
    currency: "NZD",
  })
  return isNegative ? `-${formatted}` : formatted
}

const formatSignedTransactionAmount = (amount: number): string => {
  const formatted = Math.abs(amount).toLocaleString("en-NZ", {
    style: "currency",
    currency: "NZD",
  })
  return amount < 0 ? `-${formatted}` : `+${formatted}`
}

const formatTransactionDate = (isoDate: string): string => {
  const parsed = new Date(isoDate)
  if (Number.isNaN(parsed.getTime())) {
    return isoDate
  }
  return parsed.toLocaleDateString("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

const buildTransactionSubtitle = (transaction: Transaction): string => {
  const parts: string[] = [formatTransactionDate(transaction.date)]
  if (transaction.category) {
    parts.push(transaction.category)
  }
  if (transaction.meta?.cardSuffix) {
    parts.push(`Card ••${transaction.meta.cardSuffix}`)
  } else if (transaction.meta?.reference) {
    parts.push(transaction.meta.reference)
  }
  return parts.join(" • ")
}

const AccountDetailView = ({ accountId, onBack }: { accountId: string; onBack: () => void }): React.JSX.Element => {
  const { colors, dark } = useAppTheme()
  const { data: account, isLoading } = useAkahuAccountById(accountId)
  const { data: bankConnection } = useAkahuConnectionById(account?.connectionId)
  const backgroundSyncQuery = useBackgroundTransactionsSync()
  const accountSyncQuery = useAccountTransactionsSync(accountId)
  const {
    data: infinitePages,
    isLoading: isLoadingPages,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error: pagesError,
  } = useInfiniteAccountTransactions(accountId)
  const refreshMutation = useRefreshAkahu()
  const backfillHistoryMutation = useBackfillHistoricalTransactions()

  if (isLoading) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.subtext }]}>Loading account details...</Text>
      </View>
    )
  }

  if (!account) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={44} color={colors.muted} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Account Not Found</Text>
        <TouchableOpacity style={[styles.backPillButton, { backgroundColor: colors.primarySoft }]} onPress={onBack}>
          <Ionicons name="arrow-back" size={18} color={colors.primary} />
          <Text style={[styles.backPillText, { color: colors.primary }]}>Back to Accounts</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const brandColor = bankConnection?.primaryColor || getFallbackBankColor(account.bank)
  const cardBackground = brandColor || (dark ? colors.card : colors.headerBackground)
  const cardTextColor = brandColor ? getReadableTextColor(brandColor) : colors.headerText
  const isLightCardText = cardTextColor === "#FFFFFF"
  const cardMutedTextColor = isLightCardText ? "rgba(255, 255, 255, 0.78)" : "rgba(28, 25, 23, 0.72)"
  const cardDividerColor = isLightCardText ? "rgba(255, 255, 255, 0.18)" : "rgba(28, 25, 23, 0.14)"
  const badgeOverlayBg = isLightCardText ? "rgba(255, 255, 255, 0.18)" : "rgba(28, 25, 23, 0.12)"

  const logoSource = bankConnection?.logoUri || bankConnection?.logoUrl
  const pages = infinitePages?.pages || []
  const transactionList = pages.flatMap((page) => page.items)
  const totalTransactionsCount = pages[0]?.totalCount ?? transactionList.length
  const earliestSyncedDate = pages[0]?.earliestSyncedDate ?? null
  const isDownloadingInBackground =
    backgroundSyncQuery.isFetching || accountSyncQuery.isFetching || backfillHistoryMutation.isPending
  const isSyncingAccount = refreshMutation.isPending || isDownloadingInBackground
  const detailErrorMessage =
    (refreshMutation.error instanceof Error && refreshMutation.error.message) ||
    (backfillHistoryMutation.error instanceof Error && backfillHistoryMutation.error.message) ||
    (accountSyncQuery.error instanceof Error && accountSyncQuery.error.message) ||
    (pagesError instanceof Error && pagesError.message) ||
    null

  const handleSyncAccount = (): void => {
    refreshMutation.mutate(account.id)
  }

  const handleLoadMoreTransactions = (): void => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }

  const handleFetchOlderYearFromAkahu = (): void => {
    const baseMs = earliestSyncedDate ? new Date(earliestSyncedDate).getTime() : Date.now()
    const validBaseMs = Number.isNaN(baseMs) ? Date.now() : baseMs
    const olderStartIso = new Date(validBaseMs - 365 * 24 * 60 * 60 * 1000).toISOString()
    backfillHistoryMutation.mutate({
      accountId: account.id,
      startDate: olderStartIso,
    })
  }

  const renderTransactionItem = ({ item: tx, index }: { item: Transaction; index: number }): React.JSX.Element => {
    const isCredit = tx.type === "credit"
    const primaryLabel = tx.merchantName || tx.description
    const showRawDescription = Boolean(tx.merchantName && tx.description && tx.merchantName !== tx.description)
    const isFirst = index === 0
    const isLast = index === transactionList.length - 1

    return (
      <View
        style={[
          styles.transactionRow,
          { backgroundColor: colors.card, borderColor: colors.border },
          isFirst && styles.transactionRowFirst,
          isLast && styles.transactionRowLast,
          !isLast && styles.transactionRowDivider,
        ]}
      >
        <View
          style={[
            styles.transactionIconBox,
            { backgroundColor: isCredit ? colors.positiveSoft : colors.primarySoft },
          ]}
        >
          {tx.meta?.logoUrl ? (
            <Image source={{ uri: tx.meta.logoUrl }} style={styles.merchantLogo} resizeMode="contain" />
          ) : (
            <Ionicons
              name={getTransactionIcon(tx)}
              size={20}
              color={isCredit ? colors.positive : colors.primary}
            />
          )}
        </View>

        <View style={styles.transactionInfoCol}>
          <Text
            style={[styles.transactionTitle, { color: colors.text }]}
            numberOfLines={1}
            preventOrphans={false}
          >
            {primaryLabel}
          </Text>
          {showRawDescription && (
            <Text
              style={[styles.transactionRawDescription, { color: colors.muted }]}
              numberOfLines={1}
              preventOrphans={false}
            >
              {tx.description}
            </Text>
          )}
          <Text
            style={[styles.transactionMetaText, { color: colors.subtext }]}
            numberOfLines={1}
            preventOrphans={false}
          >
            {buildTransactionSubtitle(tx)}
          </Text>
        </View>

        <View style={styles.transactionAmountCol}>
          <Text
            style={[
              styles.transactionAmountText,
              { color: isCredit ? colors.positive : colors.text },
            ]}
            preventOrphans={false}
          >
            {formatSignedTransactionAmount(tx.amount)}
          </Text>
          {tx.balance !== undefined && (
            <Text style={[styles.transactionBalanceText, { color: colors.muted }]} preventOrphans={false}>
              {formatCurrency(tx.balance)}
            </Text>
          )}
        </View>
      </View>
    )
  }

  return (
    <FlatList
      style={[styles.detailScroll, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.detailScrollContent}
      data={transactionList}
      keyExtractor={(item: Transaction): string => item.id}
      renderItem={renderTransactionItem}
      onEndReached={handleLoadMoreTransactions}
      onEndReachedThreshold={0.4}
      refreshing={refreshMutation.isPending}
      onRefresh={handleSyncAccount}
      ListHeaderComponent={
        <View>
          <View style={styles.detailTopBar}>
            <TouchableOpacity style={styles.backRow} onPress={onBack}>
              <Ionicons name="chevron-back" size={20} color={colors.primary} />
              <Text style={[styles.backRowText, { color: colors.primary }]} preventOrphans={false}>
                All Bank Accounts
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.syncButton, { backgroundColor: colors.primarySoft }]}
              onPress={handleSyncAccount}
              disabled={isSyncingAccount}
            >
              {isSyncingAccount ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="refresh" size={16} color={colors.primary} />
              )}
              <Text style={[styles.syncButtonText, { color: colors.primary }]} preventOrphans={false}>
                {refreshMutation.isPending
                  ? "Syncing..."
                  : isDownloadingInBackground
                    ? "Downloading..."
                    : "Sync"}
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.netCard,
              {
                backgroundColor: cardBackground,
                borderColor: !brandColor && dark ? colors.border : "transparent",
                borderWidth: !brandColor && dark ? 1 : 0,
              },
            ]}
          >
            <View style={styles.bankBadgeRow}>
              <View style={[styles.bankBadge, { backgroundColor: badgeOverlayBg }]}>
                {logoSource && (
                  <Image source={{ uri: logoSource }} style={styles.detailBankLogo} resizeMode="contain" />
                )}
                <Text style={[styles.bankBadgeText, { color: cardTextColor }]} preventOrphans={false}>
                  {account.bank}
                </Text>
              </View>
              <View style={[styles.typeBadge, { backgroundColor: badgeOverlayBg }]}>
                <Text style={[styles.typeBadgeText, { color: cardTextColor }]} preventOrphans={false}>
                  {account.type.toUpperCase()}
                </Text>
              </View>
            </View>

            <Text style={[styles.detailAccountName, { color: cardTextColor }]} preventOrphans={false}>
              {account.name}
            </Text>
            <Text style={[styles.detailAccountNumber, { color: cardMutedTextColor }]} preventOrphans={false}>
              {account.accountNumber}
            </Text>

            <View style={[styles.netBalanceBox, { borderTopColor: cardDividerColor }]}>
              <Text style={[styles.netLabel, { color: cardMutedTextColor }]} preventOrphans={false}>
                Net Account Balance
              </Text>
              <Text style={[styles.netAmount, { color: cardTextColor }]} preventOrphans={false}>
                {formatCurrency(account.balance)}
              </Text>

              {account.availableBalance !== undefined && (
                <Text style={[styles.availableAmount, { color: cardMutedTextColor }]} preventOrphans={false}>
                  Available Balance: {formatCurrency(account.availableBalance)}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.transactionsHeaderRow}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]} preventOrphans={false}>
                Transactions (1 Year)
              </Text>
              {isDownloadingInBackground && (
                <Text style={[styles.backgroundSyncHint, { color: colors.subtext }]} preventOrphans={false}>
                  Downloading 1-year history in background...
                </Text>
              )}
            </View>
            <View style={[styles.comingSoonPill, { backgroundColor: colors.primarySoft }]}>
              <Text style={[styles.comingSoonText, { color: colors.primary }]} preventOrphans={false}>
                {transactionList.length} of {totalTransactionsCount}
              </Text>
            </View>
          </View>

          {detailErrorMessage && (
            <View style={[styles.errorBanner, { backgroundColor: colors.negativeSoft, borderColor: colors.negative }]}>
              <Ionicons name="alert-circle" size={18} color={colors.negative} />
              <Text style={[styles.errorText, { color: colors.negative }]}>{detailErrorMessage}</Text>
            </View>
          )}
        </View>
      }
      ListEmptyComponent={
        isLoadingPages || isDownloadingInBackground ? (
          <View style={[styles.emptyTransactionsBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.subtext }]}>
              Downloading past 1 year of transactions...
            </Text>
          </View>
        ) : (
          <View style={[styles.emptyTransactionsBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.emptyTransactionsIcon, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="receipt-outline" size={30} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTransactionsTitle, { color: colors.text }]}>No Transactions Found</Text>
            <Text style={[styles.emptyTransactionsSubtitle, { color: colors.subtext }]}>
              No transactions in the past year were returned by Akahu for {account.name}. Tap Sync above to refresh
              from your bank.
            </Text>
          </View>
        )
      }
      ListFooterComponent={
        isFetchingNextPage ? (
          <View style={styles.paginationFooter}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.paginationFooterText, { color: colors.subtext }]} preventOrphans={false}>
              Loading older transactions...
            </Text>
          </View>
        ) : hasNextPage ? (
          <TouchableOpacity
            style={[styles.loadMoreButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={handleLoadMoreTransactions}
          >
            <Text style={[styles.loadMoreButtonText, { color: colors.primary }]} preventOrphans={false}>
              Load More ({transactionList.length} of {totalTransactionsCount})
            </Text>
          </TouchableOpacity>
        ) : transactionList.length > 0 ? (
          <View style={styles.paginationFooterCol}>
            <Text style={[styles.paginationFooterText, { color: colors.muted }]} preventOrphans={false}>
              {isDownloadingInBackground
                ? "Downloading older transactions in background..."
                : earliestSyncedDate
                  ? `Showing ${totalTransactionsCount} transactions since ${formatTransactionDate(earliestSyncedDate)}`
                  : `Showing all ${totalTransactionsCount} transactions`}
            </Text>
            {!isDownloadingInBackground && (
              <TouchableOpacity
                style={[styles.loadMoreButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={handleFetchOlderYearFromAkahu}
              >
                <Text style={[styles.loadMoreButtonText, { color: colors.primary }]} preventOrphans={false}>
                  Fetch Older History (+1 Year)
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : undefined
      }
    />
  )
}

const AccountsScreen = (): React.JSX.Element => {
  const { colors } = useAppTheme()
  const { data: connectionStatus, isLoading: isCheckingConnection } = useAkahuConnection()
  const { data: accounts, isLoading: isLoadingAccounts, refetch, isRefetching, error } = useAkahuAccounts()
  const { data: connectionsMap } = useAkahuConnectionsMap()
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

  const renderAccountItem = ({ item }: { item: BankAccount }): React.JSX.Element => {
    const conn = item.connectionId ? connectionsMap?.[item.connectionId] : undefined
    const logoSource = conn?.logoUri || conn?.logoUrl

    return (
      <TouchableOpacity
        style={[styles.accountCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        activeOpacity={0.7}
        onPress={(): void => handleOpenAccount(item.id)}
      >
        <View style={[styles.iconContainer, { backgroundColor: colors.primarySoft }]}>
          {logoSource ? (
            <Image source={{ uri: logoSource }} style={styles.listBankLogo} resizeMode="contain" />
          ) : (
            <Ionicons name={getAccountIcon(item.type)} size={24} color={colors.primary} />
          )}
        </View>

        <View style={styles.accountDetails}>
          <Text style={[styles.accountName, { color: colors.text }]} preventOrphans={false}>
            {item.name}
          </Text>
          <Text style={[styles.bankSubtext, { color: colors.subtext }]} preventOrphans={false}>
            {item.bank} • {item.accountNumber}
          </Text>
        </View>

        <View style={styles.rightSection}>
          <View style={styles.balanceColumn}>
            <Text
              style={[styles.balanceText, { color: item.balance < 0 ? colors.negative : colors.positive }]}
              preventOrphans={false}
            >
              {formatCurrency(item.balance)}
            </Text>
            {item.availableBalance !== undefined && item.availableBalance !== item.balance && (
              <Text style={[styles.availableText, { color: colors.subtext }]} preventOrphans={false}>
                Avail: {formatCurrency(item.availableBalance)}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.arrowHitBox}
            onPress={(): void => handleOpenAccount(item.id)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="chevron-forward" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    )
  }

  if (isCheckingConnection) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.subtext }]}>Checking Akahu connection...</Text>
      </View>
    )
  }

  if (!isConnected) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.emptyIconCircle, { backgroundColor: colors.primarySoft }]}>
          <Ionicons name="card-outline" size={36} color={colors.primary} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Akahu Connection</Text>
        <Text style={[styles.emptySubtitle, { color: colors.subtext }]}>
          Add your Akahu App ID Token and User Access Token in the Settings tab to sync and store your NZ bank accounts.
        </Text>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          onPress={(): void => router.push("/settings")}
        >
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Your Bank Accounts</Text>
          <Text style={[styles.headerSubtitle, { color: colors.subtext }]}>
            Cached locally in SQLite • Tap an account to view details
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.syncButton, { backgroundColor: colors.primarySoft }]}
          onPress={handleSync}
          disabled={refreshMutation.isPending || isRefetching}
        >
          {refreshMutation.isPending || isRefetching ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="refresh" size={18} color={colors.primary} />
          )}
          <Text style={[styles.syncButtonText, { color: colors.primary }]} preventOrphans={false}>
            {refreshMutation.isPending ? "Syncing..." : "Sync"}
          </Text>
        </TouchableOpacity>
      </View>

      {errorMessage && (
        <View style={[styles.errorBanner, { backgroundColor: colors.negativeSoft, borderColor: colors.negative }]}>
          <Ionicons name="alert-circle" size={18} color={colors.negative} />
          <Text style={[styles.errorText, { color: colors.negative }]}>{errorMessage}</Text>
        </View>
      )}

      {isLoadingAccounts && accountList.length === 0 ? (
        <View style={[styles.centeredContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.subtext }]}>Loading your NZ bank accounts...</Text>
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
              <Ionicons name="wallet-outline" size={44} color={colors.muted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Accounts Found</Text>
              <Text style={[styles.emptySubtitle, { color: colors.subtext }]}>
                Link your NZ bank accounts on Akahu and tap Sync to pull them into the app.
              </Text>
            </View>
          }
          ListFooterComponent={
            <TouchableOpacity
              style={[styles.linkBankButton, { backgroundColor: colors.card, borderColor: colors.primary }]}
              onPress={(): void => {
                AkahuAuth.openAkahuAccountSetup()
              }}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={[styles.linkBankButtonText, { color: colors.primary }]}>
                Add / Manage Bank Accounts on Akahu
              </Text>
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
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  centeredContainer: {
    flex: 1,
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
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
  },
  syncButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    marginLeft: 12,
  },
  syncButtonText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  listContent: {
    paddingBottom: 32,
  },
  accountCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
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
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
    overflow: "hidden",
  },
  listBankLogo: {
    width: 30,
    height: 30,
    borderRadius: 6,
  },
  accountDetails: {
    flex: 1,
    paddingRight: 8,
  },
  accountName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 3,
  },
  bankSubtext: {
    fontSize: 13,
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
  },
  availableText: {
    fontSize: 11,
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
    marginTop: 12,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 22,
  },
  primaryButton: {
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
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginTop: 6,
  },
  linkBankButtonText: {
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 8,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
  },
  detailScroll: {
    flex: 1,
  },
  detailScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  detailTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  backPillButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backPillText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  backRowText: {
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 4,
  },
  netCard: {
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  detailBankLogo: {
    width: 18,
    height: 18,
    borderRadius: 4,
    marginRight: 7,
  },
  bankBadgeText: {
    fontSize: 13,
    fontWeight: "700",
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  detailAccountName: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  detailAccountNumber: {
    fontSize: 14,
    marginBottom: 20,
  },
  netBalanceBox: {
    borderTopWidth: 1,
    paddingTop: 16,
  },
  netLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  netAmount: {
    fontSize: 34,
    fontWeight: "800",
  },
  availableAmount: {
    fontSize: 13,
    marginTop: 6,
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
  },
  backgroundSyncHint: {
    fontSize: 12,
    marginTop: 2,
  },
  comingSoonPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  comingSoonText: {
    fontSize: 11,
    fontWeight: "600",
  },
  transactionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  transactionRowFirst: {
    borderTopWidth: 1,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  transactionRowLast: {
    borderBottomWidth: 1,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  transactionRowDivider: {
    borderBottomWidth: 1,
  },
  transactionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  merchantLogo: {
    width: 26,
    height: 26,
    borderRadius: 6,
  },
  transactionInfoCol: {
    flex: 1,
    paddingRight: 10,
  },
  transactionTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  transactionRawDescription: {
    fontSize: 12,
    marginBottom: 2,
  },
  transactionMetaText: {
    fontSize: 12,
  },
  transactionAmountCol: {
    alignItems: "flex-end",
  },
  transactionAmountText: {
    fontSize: 15,
    fontWeight: "700",
  },
  transactionBalanceText: {
    fontSize: 11,
    marginTop: 2,
  },
  paginationFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    gap: 8,
  },
  paginationFooterCol: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
  },
  paginationFooterText: {
    fontSize: 13,
  },
  loadMoreButton: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadMoreButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  emptyTransactionsBox: {
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderStyle: "dashed",
  },
  emptyTransactionsIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  emptyTransactionsTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
  },
  emptyTransactionsSubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
})
