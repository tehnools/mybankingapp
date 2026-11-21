import type { AppStateStatus } from "react-native"
import { z } from "zod"
import {
  AkahuAccountStatusSchema,
  AkahuAccountTypeTransformSchema,
  type BankAccount,
  type BankConnection,
} from "./akahu"

export const BankConnectionDbRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  logo_url: z.string().nullable(),
  logo_file: z.string().nullable(),
  primary_color: z.string().nullable(),
  updated_at: z.number(),
})
export type BankConnectionDbRow = z.infer<typeof BankConnectionDbRowSchema>

/**
 * Creates a Zod transform schema that converts a SQLite `BankConnectionDbRow` (`snake_case`)
 * into a `BankConnection` domain object (`camelCase`), resolving `logo_file` into a `file://` URI.
 */
export const createBankConnectionDbRowTransformSchema = (
  resolveLogoUri: (logoFile: string | null) => string | undefined,
) =>
  BankConnectionDbRowSchema.transform((row: BankConnectionDbRow): BankConnection => ({
    id: row.id,
    name: row.name,
    logoUrl: row.logo_url ?? undefined,
    logoUri: resolveLogoUri(row.logo_file),
    primaryColor: row.primary_color ?? undefined,
  }))

export const BankAccountDbRowSchema = z.object({
  id: z.string(),
  connection_id: z.string().nullable().optional(),
  name: z.string(),
  bank: z.string(),
  account_number: z.string(),
  balance: z.number(),
  available_balance: z.number().nullable(),
  type: z.string(),
  status: AkahuAccountStatusSchema.nullable(),
  last_refreshed: z.string().nullable(),
  updated_at: z.number(),
})
export type BankAccountDbRow = z.infer<typeof BankAccountDbRowSchema>

/**
 * Transforms a SQLite `BankAccountDbRow` (`snake_case`) into a `BankAccount` domain object (`camelCase`).
 */
export const BankAccountDbRowTransformSchema = BankAccountDbRowSchema.transform(
  (row: BankAccountDbRow): BankAccount => ({
    id: row.id,
    connectionId: row.connection_id ?? undefined,
    name: row.name,
    bank: row.bank,
    accountNumber: row.account_number,
    balance: row.balance,
    availableBalance: row.available_balance ?? undefined,
    type: AkahuAccountTypeTransformSchema.parse(row.type),
    status: row.status ?? undefined,
    lastRefreshed: row.last_refreshed ?? undefined,
  }),
)

/**
 * Transforms a SQLite `BankConnectionDbRow` that needs logo/color branding into `{ id, logoUrl, logoFile }`.
 */
export const PendingConnectionBrandingRowTransformSchema = BankConnectionDbRowSchema.extend({
  logo_url: z.string(),
}).transform((row): { id: string; logoUrl: string; logoFile: string | null } => ({
  id: row.id,
  logoUrl: row.logo_url,
  logoFile: row.logo_file,
}))
export type PendingConnectionBranding = z.infer<typeof PendingConnectionBrandingRowTransformSchema>

/**
 * Validates user-entered 6-digit numeric PIN input.
 */
export const SixDigitPinSchema = z.string().regex(/^\d{6}$/, "PIN must be exactly 6 digits.")

/**
 * TypeScript discriminated union for Biometric Authentication results (`success: true` vs `success: false`).
 */
export type BiometricAuthResult = { success: true } | { success: false; error: string }

export interface Transaction {
  id: string
  accountId: string
  amount: number
  description: string
  merchantName?: string
  category: string
  date: string
  type: "debit" | "credit"
  rawType?: string
  meta?: {
    particulars?: string
    code?: string
    reference?: string
    other_account?: string
    card_suffix?: string
  }
}

export interface AppStoreState {
  accounts: BankAccount[]
  transactions: Transaction[]
  selectedAccountId: string | null
  isConnected: boolean
  isSessionUnlocked: boolean
  appState: AppStateStatus
  previousAppState: AppStateStatus | null
  isReturningFromBackground: boolean
  setAccounts: (accounts: BankAccount[]) => void
  setTransactions: (transactions: Transaction[]) => void
  setSelectedAccountId: (accountId: string | null) => void
  setConnected: (connected: boolean) => void
  setSessionUnlocked: (unlocked: boolean) => void
  setAppStateTransition: (nextState: AppStateStatus) => void
}

export type PinFlowMode = "closed" | "setup-pin" | "confirm-pin" | "verify-edit" | "verify-disable-bio"

/**
 * TypeScript discriminated union representing the current PIN modal state.
 */
export type PinFlowState =
  | { mode: "closed" }
  | { mode: "setup-pin" }
  | { mode: "confirm-pin"; firstPinEntry: string }
  | { mode: "verify-edit" }
  | { mode: "verify-disable-bio" }

export const getPinFlowCopy = (flow: PinFlowState): { isOpen: boolean; title: string; subtitle: string } => {
  switch (flow.mode) {
    case "closed":
      return {
        isOpen: false,
        title: "",
        subtitle: "",
      }
    case "setup-pin":
      return {
        isOpen: true,
        title: "Create a 6-Digit PIN",
        subtitle: "Your 6-digit PIN is mandatory and protects your tokens if biometrics are unavailable or removed.",
      }
    case "confirm-pin":
      return {
        isOpen: true,
        title: "Confirm Your 6-Digit PIN",
        subtitle: "Re-enter your 6-digit PIN. Biometric uplift will follow right after.",
      }
    case "verify-disable-bio":
      return {
        isOpen: true,
        title: "Enter 6-Digit PIN",
        subtitle: "Confirm your 6-digit PIN to turn off Biometric Unlock. Your tokens will stay safe.",
      }
    case "verify-edit":
      return {
        isOpen: true,
        title: "Unlock Credentials",
        subtitle: "Enter your 6-digit PIN to unlock and edit your Akahu tokens.",
      }
  }
}

export interface SettingsFormState {
  draftAppToken: string
  draftUserToken: string
  showUserToken: boolean
  isUnlockedForEditing: boolean
  showWipeModal: boolean
  pinFlowMode: PinFlowMode
  pinInput: string
  firstPinEntry: string
  pinError: string | null
  setDraftAppToken: (value: string) => void
  setDraftUserToken: (value: string) => void
  toggleShowUserToken: () => void
  unlockFormWithTokens: (appToken: string, userToken: string) => void
  lockForm: () => void
  resetForm: () => void
  setShowWipeModal: (visible: boolean) => void
  openPinFlow: (mode: Exclude<PinFlowMode, "closed">) => void
  closePinFlow: () => void
  setPinInput: (pin: string) => void
  advanceToConfirmPin: (firstPin: string) => void
  setPinError: (error: string | null) => void
}

export interface LockScreenState {
  pinInput: string
  setPinInput: (pin: string) => void
  clearPinInput: () => void
}

export interface AppLifecycleState {
  appState: AppStateStatus
  previousAppState: AppStateStatus | null
  isForeground: boolean
  isBackground: boolean
  isReturningFromBackground: boolean
  isSessionUnlocked: boolean
  requiresUnlock: boolean
  biometricEnabled: boolean
  hasPin: boolean
  isLoading: boolean
}
