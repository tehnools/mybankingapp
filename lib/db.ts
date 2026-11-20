import { Platform } from "react-native"
import * as SQLite from "expo-sqlite"
import { deleteAllLogoFiles, getLogoUriFromFileName } from "./logo-files"
import type { BankAccount, BankAccountDbRow, BankConnection, BankConnectionDbRow } from "../types"

const DB_NAME = "nz_money_manager.db"

let dbInstancePromise: Promise<SQLite.SQLiteDatabase | null> | null = null
let memoryFallbackAccounts: BankAccount[] = []

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
        `)

        // Migration: databases created before bank connections existed lack bank_accounts.connection_id
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

const mapRowToBankAccount = (row: BankAccountDbRow): BankAccount => ({
  id: row.id,
  connectionId: row.connection_id ?? undefined,
  name: row.name,
  bank: row.bank,
  accountNumber: row.account_number,
  balance: row.balance,
  availableBalance: row.available_balance ?? undefined,
  type: row.type,
  status: row.status ?? undefined,
  lastRefreshed: row.last_refreshed ?? undefined,
})

const mapRowToBankConnection = (row: BankConnectionDbRow): BankConnection => ({
  id: row.id,
  name: row.name,
  logoUrl: row.logo_url ?? undefined,
  logoUri: getLogoUriFromFileName(row.logo_file),
  primaryColor: row.primary_color ?? undefined,
})

export const getCachedAccountsFromDb = async (): Promise<BankAccount[]> => {
  const db = await getDatabase()
  if (!db) {
    return memoryFallbackAccounts
  }

  const rows = await db.getAllAsync<BankAccountDbRow>("SELECT * FROM bank_accounts ORDER BY bank ASC, name ASC;")
  return rows.map(mapRowToBankAccount)
}

export const getCachedAccountByIdFromDb = async (accountId: string): Promise<BankAccount | null> => {
  const db = await getDatabase()
  if (!db) {
    return memoryFallbackAccounts.find((acc: BankAccount): boolean => acc.id === accountId) || null
  }

  const row = await db.getFirstAsync<BankAccountDbRow>("SELECT * FROM bank_accounts WHERE id = ? LIMIT 1;", [
    accountId,
  ])
  return row ? mapRowToBankAccount(row) : null
}

export const upsertAccountsToDb = async (accounts: BankAccount[]): Promise<void> => {
  memoryFallbackAccounts = accounts

  const db = await getDatabase()
  if (!db) {
    return
  }

  const now = Date.now()
  await db.withTransactionAsync(async (): Promise<void> => {
    await db.execAsync("DELETE FROM bank_accounts;")
    for (const account of accounts) {
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
  return rows.map(mapRowToBankConnection)
}

export const getCachedConnectionByIdFromDb = async (connectionId: string): Promise<BankConnection | null> => {
  const db = await getDatabase()
  if (!db) {
    return null
  }

  const row = await db.getFirstAsync<BankConnectionDbRow>("SELECT * FROM bank_connections WHERE id = ? LIMIT 1;", [
    connectionId,
  ])
  return row ? mapRowToBankConnection(row) : null
}

/**
 * Inserts or updates connections. A connection's cached logo file and brand color are kept
 * as long as its `logo_url` is unchanged, and reset when Akahu serves a new logo.
 */
export const upsertConnectionsToDb = async (
  connections: Array<Pick<BankConnection, "id" | "name" | "logoUrl">>,
): Promise<void> => {
  const db = await getDatabase()
  if (!db) {
    return
  }

  const now = Date.now()
  await db.withTransactionAsync(async (): Promise<void> => {
    for (const connection of connections) {
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

export const getConnectionsNeedingBranding = async (): Promise<
  Array<{ id: string; logoUrl: string; logoFile: string | null }>
> => {
  const db = await getDatabase()
  if (!db) {
    return []
  }

  const rows = await db.getAllAsync<BankConnectionDbRow>(
    "SELECT * FROM bank_connections WHERE logo_url IS NOT NULL AND (logo_file IS NULL OR primary_color IS NULL);",
  )
  return rows.map((row: BankConnectionDbRow) => ({
    id: row.id,
    logoUrl: row.logo_url as string,
    logoFile: row.logo_file,
  }))
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

export const clearAccountsDb = async (): Promise<void> => {
  memoryFallbackAccounts = []
  deleteAllLogoFiles()

  const db = await getDatabase()
  if (!db) {
    return
  }

  await db.execAsync("DELETE FROM bank_accounts; DELETE FROM bank_connections;")
}
