import { Platform } from "react-native"
import * as SQLite from "expo-sqlite"
import { z } from "zod"
import { deleteAllLogoFiles, getLogoUriFromFileName } from "./logo-files"
import {
  BankAccountDbRowTransformSchema,
  BankAccountSchema,
  BankConnectionUpsertInputSchema,
  BankTransactionDbRowTransformSchema,
  createBankConnectionDbRowTransformSchema,
  PendingConnectionBrandingRowTransformSchema,
  TransactionSchema,
  type BankAccount,
  type BankAccountDbRow,
  type BankConnection,
  type BankConnectionDbRow,
  type BankConnectionUpsertInput,
  type BankTransactionDbRow,
  type CategorySpendingSummary,
  type PendingConnectionBranding,
  type Transaction,
  type TransactionFilterOptions,
  type TransactionPage,
  type TransactionSyncStateRow,
} from "../types"

const DB_NAME = "nz_money_manager.db"

const BankConnectionDbRowTransformSchema = createBankConnectionDbRowTransformSchema(getLogoUriFromFileName)
const BankAccountDbRowListTransformSchema = z.array(BankAccountDbRowTransformSchema)
const BankConnectionDbRowListTransformSchema = z.array(BankConnectionDbRowTransformSchema)
const PendingConnectionBrandingListTransformSchema = z.array(PendingConnectionBrandingRowTransformSchema)
const BankTransactionDbRowListTransformSchema = z.array(BankTransactionDbRowTransformSchema)
const BankAccountUpsertListSchema = z.array(BankAccountSchema)
const BankConnectionUpsertListSchema = z.array(BankConnectionUpsertInputSchema)
const TransactionUpsertListSchema = z.array(TransactionSchema)

let dbInstancePromise: Promise<SQLite.SQLiteDatabase | null> | null = null
let memoryFallbackAccounts: BankAccount[] = []
let memoryFallbackTransactions = new Map<string, Transaction>()
let memoryFallbackSyncState = new Map<string, TransactionSyncStateRow>()

const getDatabase = async (): Promise<SQLite.SQLiteDatabase | null> => {
  if (Platform.OS === "web") {
    return null
  }

  if (!dbInstancePromise) {
    dbInstancePromise = (async (): Promise<SQLite.SQLiteDatabase | null> => {
      try {
        const db = await SQLite.openDatabaseAsync(DB_NAME)
        await db.execAsync(`
          CREATE TABLE IF NOT EXISTS bank_accounts (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            bank TEXT NOT NULL,
            account_number TEXT NOT NULL,
            balance REAL NOT NULL,
            available_balance REAL,
            type TEXT NOT NULL,
            status TEXT,
            last_refreshed TEXT,
            updated_at INTEGER NOT NULL
          );
          CREATE TABLE IF NOT EXISTS bank_connections (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            logo_url TEXT,
            logo_file TEXT,
            primary_color TEXT,
            updated_at INTEGER NOT NULL
          );
          CREATE TABLE IF NOT EXISTS bank_transactions (
            id TEXT PRIMARY KEY NOT NULL,
            account_id TEXT NOT NULL,
            connection_id TEXT,
            amount REAL NOT NULL,
            balance REAL,
            description TEXT NOT NULL,
            merchant_name TEXT,
            category TEXT NOT NULL,
            category_group TEXT,
            date TEXT NOT NULL,
            type TEXT NOT NULL,
            raw_type TEXT,
            meta_json TEXT,
            updated_at INTEGER NOT NULL
          );
          CREATE INDEX IF NOT EXISTS idx_bank_transactions_account_date
            ON bank_transactions (account_id, date DESC);
          CREATE INDEX IF NOT EXISTS idx_bank_transactions_date
            ON bank_transactions (date DESC);
          CREATE TABLE IF NOT EXISTS bank_sync_state (
            scope_key TEXT PRIMARY KEY NOT NULL,
            earliest_synced_date TEXT NOT NULL,
            latest_synced_date TEXT NOT NULL,
            updated_at INTEGER NOT NULL
          );
        `)

        const columns = await db.getAllAsync<{ name: string }>("PRAGMA table_info(bank_accounts);")
        if (!columns.some((column: { name: string }): boolean => column.name === "connection_id")) {
          await db.execAsync("ALTER TABLE bank_accounts ADD COLUMN connection_id TEXT;")
        }

        return db
      } catch (error) {
        console.warn("SQLite unavailable, falling back to in-memory cache:", error)
        return null
      }
    })()
  }

  return dbInstancePromise
}

export const getCachedAccountsFromDb = async (): Promise<BankAccount[]> => {
  const db = await getDatabase()
  if (!db) {
    return memoryFallbackAccounts
  }

  const rows = await db.getAllAsync<BankAccountDbRow>("SELECT * FROM bank_accounts ORDER BY bank ASC, name ASC;")
  return BankAccountDbRowListTransformSchema.parse(rows)
}

export const getCachedAccountByIdFromDb = async (accountId: string): Promise<BankAccount | null> => {
  const db = await getDatabase()
  if (!db) {
    return memoryFallbackAccounts.find((acc: BankAccount): boolean => acc.id === accountId) || null
  }

  const row = await db.getFirstAsync<BankAccountDbRow>("SELECT * FROM bank_accounts WHERE id = ? LIMIT 1;", [
    accountId,
  ])
  return row ? BankAccountDbRowTransformSchema.parse(row) : null
}

export const upsertAccountsToDb = async (accounts: BankAccount[]): Promise<void> => {
  const validatedAccounts = BankAccountUpsertListSchema.parse(accounts)
  memoryFallbackAccounts = validatedAccounts

  const db = await getDatabase()
  if (!db) {
    return
  }

  const now = Date.now()
  await db.withTransactionAsync(async (): Promise<void> => {
    await db.execAsync("DELETE FROM bank_accounts;")
    for (const account of validatedAccounts) {
      await db.runAsync(
        `INSERT OR REPLACE INTO bank_accounts (
          id, connection_id, name, bank, account_number, balance, available_balance, type, status, last_refreshed, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          account.id,
          account.connectionId ?? null,
          account.name,
          account.bank,
          account.accountNumber,
          account.balance,
          account.availableBalance ?? null,
          account.type,
          account.status ?? null,
          account.lastRefreshed ?? null,
          now,
        ],
      )
    }
  })
}

export const getCachedConnectionsFromDb = async (): Promise<BankConnection[]> => {
  const db = await getDatabase()
  if (!db) {
    return []
  }

  const rows = await db.getAllAsync<BankConnectionDbRow>("SELECT * FROM bank_connections ORDER BY name ASC;")
  return BankConnectionDbRowListTransformSchema.parse(rows)
}

export const getCachedConnectionByIdFromDb = async (connectionId: string): Promise<BankConnection | null> => {
  const db = await getDatabase()
  if (!db) {
    return null
  }

  const row = await db.getFirstAsync<BankConnectionDbRow>("SELECT * FROM bank_connections WHERE id = ? LIMIT 1;", [
    connectionId,
  ])
  return row ? BankConnectionDbRowTransformSchema.parse(row) : null
}

export const upsertConnectionsToDb = async (connections: BankConnectionUpsertInput[]): Promise<void> => {
  const validatedConnections = BankConnectionUpsertListSchema.parse(connections)
  const db = await getDatabase()
  if (!db) {
    return
  }

  const now = Date.now()
  await db.withTransactionAsync(async (): Promise<void> => {
    for (const connection of validatedConnections) {
      await db.runAsync(
        `INSERT INTO bank_connections (id, name, logo_url, logo_file, primary_color, updated_at)
         VALUES (?, ?, ?, NULL, NULL, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           logo_file = CASE WHEN bank_connections.logo_url IS excluded.logo_url THEN bank_connections.logo_file ELSE NULL END,
           primary_color = CASE WHEN bank_connections.logo_url IS excluded.logo_url THEN bank_connections.primary_color ELSE NULL END,
           logo_url = excluded.logo_url,
           updated_at = excluded.updated_at;`,
        [connection.id, connection.name, connection.logoUrl ?? null, now],
      )
    }
  })
}

export const getConnectionsNeedingBranding = async (): Promise<PendingConnectionBranding[]> => {
  const db = await getDatabase()
  if (!db) {
    return []
  }

  const rows = await db.getAllAsync<BankConnectionDbRow>(
    "SELECT * FROM bank_connections WHERE logo_url IS NOT NULL AND (logo_file IS NULL OR primary_color IS NULL);",
  )
  return PendingConnectionBrandingListTransformSchema.parse(rows)
}

export const updateConnectionBranding = async (
  connectionId: string,
  branding: { logoFile: string | null; primaryColor: string | null },
): Promise<void> => {
  const db = await getDatabase()
  if (!db) {
    return
  }

  await db.runAsync("UPDATE bank_connections SET logo_file = ?, primary_color = ? WHERE id = ?;", [
    branding.logoFile,
    branding.primaryColor,
    connectionId,
  ])
}

export const clearConnectionBrandColors = async (): Promise<void> => {
  const db = await getDatabase()
  if (!db) {
    return
  }

  await db.execAsync("UPDATE bank_connections SET primary_color = NULL;")
}

const filterMemoryTransactions = (filters: TransactionFilterOptions = {}): Transaction[] =>
  Array.from(memoryFallbackTransactions.values())
    .filter((tx: Transaction): boolean => {
      if (filters.accountId && tx.accountId !== filters.accountId) return false
      if (filters.startDate && tx.date < filters.startDate) return false
      if (filters.endDate && tx.date > filters.endDate) return false
      return true
    })
    .sort((a: Transaction, b: Transaction): number => b.date.localeCompare(a.date))

const buildTransactionWhereClause = (
  filters: TransactionFilterOptions = {},
): { whereSql: string; params: Array<string | number> } => {
  const clauses: string[] = []
  const params: Array<string | number> = []

  if (filters.accountId) {
    clauses.push("account_id = ?")
    params.push(filters.accountId)
  }
  if (filters.startDate) {
    clauses.push("date >= ?")
    params.push(filters.startDate)
  }
  if (filters.endDate) {
    clauses.push("date <= ?")
    params.push(filters.endDate)
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : ""
  return { whereSql, params }
}

export const getTransactionSyncStateFromDb = async (scopeKey = "all"): Promise<TransactionSyncStateRow | null> => {
  const db = await getDatabase()
  if (!db) {
    return memoryFallbackSyncState.get(scopeKey) ?? null
  }

  const row = await db.getFirstAsync<TransactionSyncStateRow>(
    "SELECT * FROM bank_sync_state WHERE scope_key = ? LIMIT 1;",
    [scopeKey],
  )
  return row ?? null
}

export const upsertTransactionSyncStateToDb = async (
  scopeKey: string,
  window: { earliestSyncedDate: string; latestSyncedDate: string },
): Promise<void> => {
  const existing = await getTransactionSyncStateFromDb(scopeKey)
  const earliestSyncedDate =
    existing && existing.earliest_synced_date < window.earliestSyncedDate
      ? existing.earliest_synced_date
      : window.earliestSyncedDate
  const latestSyncedDate =
    existing && existing.latest_synced_date > window.latestSyncedDate
      ? existing.latest_synced_date
      : window.latestSyncedDate
  const updatedAt = Date.now()

  const nextRow: TransactionSyncStateRow = {
    scope_key: scopeKey,
    earliest_synced_date: earliestSyncedDate,
    latest_synced_date: latestSyncedDate,
    updated_at: updatedAt,
  }
  memoryFallbackSyncState.set(scopeKey, nextRow)

  const db = await getDatabase()
  if (!db) {
    return
  }

  await db.runAsync(
    `INSERT OR REPLACE INTO bank_sync_state (scope_key, earliest_synced_date, latest_synced_date, updated_at)
     VALUES (?, ?, ?, ?);`,
    [scopeKey, earliestSyncedDate, latestSyncedDate, updatedAt],
  )
}

export const getCachedTransactionsFromDb = async (filters: TransactionFilterOptions = {}): Promise<Transaction[]> => {
  const db = await getDatabase()
  if (!db) {
    return filterMemoryTransactions(filters)
  }

  const { whereSql, params } = buildTransactionWhereClause(filters)
  const rows = await db.getAllAsync<BankTransactionDbRow>(
    `SELECT * FROM bank_transactions ${whereSql} ORDER BY date DESC, id DESC;`,
    params,
  )
  return BankTransactionDbRowListTransformSchema.parse(rows)
}

export const getCachedTransactionsByAccountIdFromDb = async (accountId: string): Promise<Transaction[]> =>
  getCachedTransactionsFromDb({ accountId })

export const getCachedTransactionsPageFromDb = async (
  options: TransactionFilterOptions & { limit: number; offset: number },
): Promise<TransactionPage> => {
  const { limit, offset, ...filters } = options
  const scopeKey = filters.accountId || "all"
  const syncState =
    (await getTransactionSyncStateFromDb(scopeKey)) ?? (await getTransactionSyncStateFromDb("all"))
  const earliestSyncedDate = syncState?.earliest_synced_date ?? null

  const db = await getDatabase()
  if (!db) {
    const all = filterMemoryTransactions(filters)
    const items = all.slice(offset, offset + limit)
    const nextOffset = offset + items.length < all.length ? offset + items.length : null
    return {
      items,
      totalCount: all.length,
      nextOffset,
      earliestSyncedDate,
    }
  }

  const { whereSql, params } = buildTransactionWhereClause(filters)
  const countRow = await db.getFirstAsync<{ total: number }>(
    `SELECT COUNT(*) as total FROM bank_transactions ${whereSql};`,
    params,
  )
  const totalCount = countRow?.total ?? 0

  const rows = await db.getAllAsync<BankTransactionDbRow>(
    `SELECT * FROM bank_transactions ${whereSql} ORDER BY date DESC, id DESC LIMIT ? OFFSET ?;`,
    [...params, limit, offset],
  )
  const items = BankTransactionDbRowListTransformSchema.parse(rows)
  const nextOffset = offset + items.length < totalCount ? offset + items.length : null

  return {
    items,
    totalCount,
    nextOffset,
    earliestSyncedDate,
  }
}

export const getCachedTransactionsPageByAccountIdFromDb = async (
  accountId: string,
  limit: number,
  offset: number,
  dateRange?: { startDate?: string; endDate?: string },
): Promise<TransactionPage> =>
  getCachedTransactionsPageFromDb({
    accountId,
    startDate: dateRange?.startDate,
    endDate: dateRange?.endDate,
    limit,
    offset,
  })

export const getCategorySpendingSummaryFromDb = async (
  filters: TransactionFilterOptions = {},
): Promise<CategorySpendingSummary[]> => {
  const db = await getDatabase()
  if (!db) {
    const debits = filterMemoryTransactions(filters).filter((tx: Transaction): boolean => tx.amount < 0)
    const grouped = new Map<string, CategorySpendingSummary>()
    for (const tx of debits) {
      const existing = grouped.get(tx.category)
      const absAmount = Math.abs(tx.amount)
      if (existing) {
        existing.totalAmount += absAmount
        existing.transactionCount += 1
      } else {
        grouped.set(tx.category, {
          category: tx.category,
          categoryGroup: tx.categoryGroup,
          totalAmount: absAmount,
          transactionCount: 1,
        })
      }
    }
    return Array.from(grouped.values()).sort((a, b) => b.totalAmount - a.totalAmount)
  }

  const { whereSql, params } = buildTransactionWhereClause(filters)
  const debitWhereSql = whereSql ? `${whereSql} AND amount < 0` : "WHERE amount < 0"
  const rows = await db.getAllAsync<{
    category: string
    category_group: string | null
    total_amount: number
    transaction_count: number
  }>(
    `SELECT
       category,
       MAX(category_group) as category_group,
       SUM(ABS(amount)) as total_amount,
       COUNT(*) as transaction_count
     FROM bank_transactions
     ${debitWhereSql}
     GROUP BY category
     ORDER BY total_amount DESC;`,
    params,
  )

  return rows.map((row) => ({
    category: row.category,
    categoryGroup: row.category_group ?? undefined,
    totalAmount: row.total_amount,
    transactionCount: row.transaction_count,
  }))
}

export const getTransactionCountForAccountFromDb = async (accountId?: string): Promise<number> => {
  const db = await getDatabase()
  if (!db) {
    return filterMemoryTransactions({ accountId }).length
  }

  const row = accountId
    ? await db.getFirstAsync<{ total: number }>(
        "SELECT COUNT(*) as total FROM bank_transactions WHERE account_id = ?;",
        [accountId],
      )
    : await db.getFirstAsync<{ total: number }>("SELECT COUNT(*) as total FROM bank_transactions;")

  return row?.total ?? 0
}

export const getNewestTransactionDateFromDb = async (accountId?: string): Promise<string | null> => {
  const db = await getDatabase()
  if (!db) {
    const list = filterMemoryTransactions({ accountId })
    return list[0]?.date ?? null
  }

  const row = accountId
    ? await db.getFirstAsync<{ newest: string | null }>(
        "SELECT MAX(date) as newest FROM bank_transactions WHERE account_id = ?;",
        [accountId],
      )
    : await db.getFirstAsync<{ newest: string | null }>("SELECT MAX(date) as newest FROM bank_transactions;")

  return row?.newest ?? null
}

export const getOldestTransactionDateFromDb = async (accountId?: string): Promise<string | null> => {
  const db = await getDatabase()
  if (!db) {
    const list = filterMemoryTransactions({ accountId })
    return list[list.length - 1]?.date ?? null
  }

  const row = accountId
    ? await db.getFirstAsync<{ oldest: string | null }>(
        "SELECT MIN(date) as oldest FROM bank_transactions WHERE account_id = ?;",
        [accountId],
      )
    : await db.getFirstAsync<{ oldest: string | null }>("SELECT MIN(date) as oldest FROM bank_transactions;")

  return row?.oldest ?? null
}

export const upsertTransactionsBatchToDb = async (transactions: Transaction[]): Promise<void> => {
  if (transactions.length === 0) {
    return
  }

  const validatedTransactions = TransactionUpsertListSchema.parse(transactions)
  for (const tx of validatedTransactions) {
    memoryFallbackTransactions.set(tx.id, tx)
  }

  const db = await getDatabase()
  if (!db) {
    return
  }

  const now = Date.now()
  await db.withTransactionAsync(async (): Promise<void> => {
    for (const tx of validatedTransactions) {
      await db.runAsync(
        `INSERT OR REPLACE INTO bank_transactions (
          id, account_id, connection_id, amount, balance, description, merchant_name, category, category_group, date, type, raw_type, meta_json, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          tx.id,
          tx.accountId,
          tx.connectionId ?? null,
          tx.amount,
          tx.balance ?? null,
          tx.description,
          tx.merchantName ?? null,
          tx.category,
          tx.categoryGroup ?? null,
          tx.date,
          tx.type,
          tx.rawType ?? null,
          tx.meta ? JSON.stringify(tx.meta) : null,
          now,
        ],
      )
    }
  })
}

export const clearAccountsDb = async (): Promise<void> => {
  memoryFallbackAccounts = []
  memoryFallbackTransactions.clear()
  memoryFallbackSyncState.clear()
  deleteAllLogoFiles()

  const db = await getDatabase()
  if (!db) {
    return
  }

  await db.execAsync(
    "DELETE FROM bank_accounts; DELETE FROM bank_connections; DELETE FROM bank_transactions; DELETE FROM bank_sync_state;",
  )
}
