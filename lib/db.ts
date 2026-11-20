import { Platform } from "react-native"
import * as SQLite from "expo-sqlite"
import type { BankAccount, BankAccountDbRow } from "../types"

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
        `)
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
  name: row.name,
  bank: row.bank,
  accountNumber: row.account_number,
  balance: row.balance,
  availableBalance: row.available_balance ?? undefined,
  type: row.type,
  status: row.status ?? undefined,
  lastRefreshed: row.last_refreshed ?? undefined,
})

export const getCachedAccountsFromDb = async (): Promise<BankAccount[]> => {
  const db = await getDatabase()
  if (!db) {
    return memoryFallbackAccounts
  }

  const rows = await db.getAllAsync<BankAccountDbRow>(
    "SELECT * FROM bank_accounts ORDER BY bank ASC, name ASC;",
  )
  return rows.map(mapRowToBankAccount)
}

export const getCachedAccountByIdFromDb = async (accountId: string): Promise<BankAccount | null> => {
  const db = await getDatabase()
  if (!db) {
    return memoryFallbackAccounts.find((acc: BankAccount): boolean => acc.id === accountId) || null
  }

  const row = await db.getFirstAsync<BankAccountDbRow>(
    "SELECT * FROM bank_accounts WHERE id = ? LIMIT 1;",
    [accountId],
  )
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
          id, name, bank, account_number, balance, available_balance, type, status, last_refreshed, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          account.id,
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

export const clearAccountsDb = async (): Promise<void> => {
  memoryFallbackAccounts = []

  const db = await getDatabase()
  if (!db) {
    return
  }

  await db.execAsync("DELETE FROM bank_accounts;")
}
