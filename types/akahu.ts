import { z } from "zod"
import type {
  Account as AkahuRawAccount,
  AccountType as AkahuAccountType,
  ConnectionInfo as AkahuConnectionInfo,
  PendingTransaction as AkahuRawPendingTransaction,
  Transaction as AkahuRawTransaction,
  TransactionQueryParams as AkahuTransactionQueryParams,
  User as AkahuUser,
} from "akahu"

export type {
  AkahuRawAccount,
  AkahuAccountType,
  AkahuConnectionInfo,
  AkahuRawPendingTransaction,
  AkahuRawTransaction,
  AkahuTransactionQueryParams,
  AkahuUser,
}

export const BankAccountTypeSchema = z.enum(["checking", "savings", "credit", "investment", "kiwisaver", "loan"])
export type BankAccountType = z.infer<typeof BankAccountTypeSchema>

export const AkahuAccountStatusSchema = z.enum(["ACTIVE", "INACTIVE"])
export type AkahuAccountStatus = z.infer<typeof AkahuAccountStatusSchema>

export const BankConnectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  logoUrl: z.string().optional(),
  logoUri: z.string().optional(),
  primaryColor: z.string().optional(),
})
export type BankConnection = z.infer<typeof BankConnectionSchema>

export const BankConnectionUpsertInputSchema = BankConnectionSchema.pick({
  id: true,
  name: true,
  logoUrl: true,
})
export type BankConnectionUpsertInput = z.infer<typeof BankConnectionUpsertInputSchema>

export const BankAccountSchema = z.object({
  id: z.string(),
  connectionId: z.string().optional(),
  name: z.string(),
  bank: z.string(),
  accountNumber: z.string(),
  balance: z.number(),
  availableBalance: z.number().optional(),
  type: BankAccountTypeSchema,
  status: AkahuAccountStatusSchema.optional(),
  lastRefreshed: z.string().optional(),
})
export type BankAccount = z.infer<typeof BankAccountSchema>

export const TransactionDirectionSchema = z.enum(["debit", "credit"])
export type TransactionDirection = z.infer<typeof TransactionDirectionSchema>

export const TransactionMetaSchema = z.object({
  particulars: z.string().optional(),
  code: z.string().optional(),
  reference: z.string().optional(),
  otherAccount: z.string().optional(),
  cardSuffix: z.string().optional(),
  logoUrl: z.string().optional(),
})
export type TransactionMeta = z.infer<typeof TransactionMetaSchema>

export const TransactionSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  connectionId: z.string().optional(),
  amount: z.number(),
  balance: z.number().optional(),
  description: z.string(),
  merchantName: z.string().optional(),
  category: z.string(),
  categoryGroup: z.string().optional(),
  date: z.string(),
  type: TransactionDirectionSchema,
  rawType: z.string().optional(),
  meta: TransactionMetaSchema.optional(),
})
export type Transaction = z.infer<typeof TransactionSchema>

export const AkahuAccountTypeTransformSchema = z
  .string()
  .optional()
  .transform((rawType: string | undefined): BankAccountType => {
    switch (rawType?.toUpperCase()) {
      case "CREDITCARD":
      case "CREDIT_CARD":
        return "credit"
      case "SAVINGS":
      case "TERMDEPOSIT":
        return "savings"
      case "KIWISAVER":
        return "kiwisaver"
      case "INVESTMENT":
        return "investment"
      case "LOAN":
      case "MORTGAGE":
        return "loan"
      default:
        return "checking"
    }
  })

export const AkahuPersonalTokensTransformSchema = z
  .object({
    appToken: z
      .string()
      .transform((val: string): string => val.trim())
      .refine((val: string): boolean => val.length > 0, {
        message: "Please enter both your App ID Token and User Access Token.",
      })
      .refine((val: string): boolean => val.startsWith("app_token_"), {
        message: "App ID Token must start with 'app_token_'",
      }),
    userToken: z
      .string()
      .transform((val: string): string => val.replace(/^Bearer\s+/i, "").trim())
      .refine((val: string): boolean => val.length > 0, {
        message: "Please enter both your App ID Token and User Access Token.",
      })
      .refine((val: string): boolean => val.startsWith("user_token_"), {
        message: "User Access Token must start with 'user_token_'",
      }),
  })
  .transform(
    ({
      appToken,
      userToken,
    }: {
      appToken: string
      userToken: string
    }): { cleanAppToken: string; cleanUserToken: string } => ({
      cleanAppToken: appToken,
      cleanUserToken: userToken,
    }),
  )

export type AkahuCleanedPersonalTokens = z.infer<typeof AkahuPersonalTokensTransformSchema>

export const AkahuClipboardTextTransformSchema = z
  .string()
  .transform((rawText: string): { pastedAppToken: string | null; pastedUserToken: string | null } => {
    const trimmed = rawText.trim()
    if (!trimmed) {
      return { pastedAppToken: null, pastedUserToken: null }
    }
    const appTokenMatch = trimmed.match(/app_token_[A-Za-z0-9]+/)
    const userTokenMatch = trimmed.match(/user_token_[A-Za-z0-9]+/)
    return {
      pastedAppToken: appTokenMatch ? appTokenMatch[0] : null,
      pastedUserToken: userTokenMatch ? userTokenMatch[0] : null,
    }
  })

export type AkahuClipboardPasteResult = z.infer<typeof AkahuClipboardTextTransformSchema>

export const StoredUserProfileSchema = z.object({
  _id: z.string(),
  email: z.string().optional(),
  preferred_name: z.string().optional(),
  access_granted_at: z.string().optional().default(""),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
})

export interface AkahuStoredSettings {
  appToken: string
  accessToken: string
  hasPin: boolean
  biometricEnabled: boolean
  hasStoredTokens: boolean
  biometricsDisabledByOs: boolean
}

export type AkahuConnectionStatus =
  | { connected: true; user: AkahuUser }
  | { connected: false; user: null }

export type AkahuConnectResult =
  | { success: true; user: AkahuUser }
  | { success: false; error: string }

export type AkahuAuthCallbackResult =
  | { success: true; accessToken: string }
  | { success: false; error: string }

export const transformAkahuAccountToBankAccount = (account: AkahuRawAccount): BankAccount =>
  BankAccountSchema.parse({
    id: account._id,
    connectionId: account.connection?._id,
    name: account.name,
    bank: account.connection?.name || "NZ Bank",
    accountNumber: account.formatted_account || "••••",
    balance: account.balance?.current ?? 0,
    availableBalance: account.balance?.available,
    type: AkahuAccountTypeTransformSchema.parse(account.type),
    status: account.status,
    lastRefreshed: account.refreshed?.balance || account.refreshed?.transactions,
  })

export const transformAkahuAccountsForDb = (
  rawAccounts: AkahuRawAccount[],
): {
  accounts: BankAccount[]
  connections: BankConnectionUpsertInput[]
} => {
  const accounts: BankAccount[] = []
  const connectionsMap = new Map<string, BankConnectionUpsertInput>()

  for (const raw of rawAccounts) {
    accounts.push(transformAkahuAccountToBankAccount(raw))
    const connId = raw.connection?._id
    if (connId && !connectionsMap.has(connId)) {
      connectionsMap.set(
        connId,
        BankConnectionUpsertInputSchema.parse({
          id: connId,
          name: raw.connection.name || "NZ Bank",
          logoUrl: raw.connection.logo || undefined,
        }),
      )
    }
  }

  return {
    accounts,
    connections: Array.from(connectionsMap.values()),
  }
}

const formatRawTransactionTypeLabel = (rawType?: string): string => {
  if (!rawType) return "General"
  return rawType
    .toLowerCase()
    .split(/[\s_]+/)
    .map((word: string): string => (word ? `${word[0].toUpperCase()}${word.slice(1)}` : ""))
    .join(" ")
}

export const transformAkahuTransactionToTransaction = (tx: AkahuRawTransaction): Transaction => {
  const merchantName = "merchant" in tx && tx.merchant?.name ? tx.merchant.name : undefined
  const categoryName =
    "category" in tx && tx.category?.name ? tx.category.name : formatRawTransactionTypeLabel(tx.type)
  const categoryGroup =
    "category" in tx && tx.category?.groups?.personal_finance?.name
      ? tx.category.groups.personal_finance.name
      : undefined
  const rawMeta = "meta" in tx ? tx.meta : undefined

  return TransactionSchema.parse({
    id: tx._id,
    accountId: tx._account,
    connectionId: tx._connection,
    amount: tx.amount,
    balance: tx.balance,
    description: tx.description,
    merchantName,
    category: categoryName,
    categoryGroup,
    date: tx.date,
    type: tx.amount < 0 ? "debit" : "credit",
    rawType: tx.type,
    meta: rawMeta
      ? {
          particulars: rawMeta.particulars,
          code: rawMeta.code,
          reference: rawMeta.reference,
          otherAccount: rawMeta.other_account,
          cardSuffix: rawMeta.card_suffix,
          logoUrl: rawMeta.logo,
        }
      : undefined,
  })
}

export const transformAkahuTransactionsForDb = (rawTransactions: AkahuRawTransaction[]): Transaction[] =>
  rawTransactions.map(transformAkahuTransactionToTransaction)
