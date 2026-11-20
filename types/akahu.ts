export interface AkahuUser {
  _id: string
  email?: string
  first_name?: string
  last_name?: string
}

export interface AkahuStoredSettings {
  appToken: string
  accessToken: string
  biometricEnabled: boolean
  hasStoredTokens: boolean
  wipedDueToMissingBiometrics: boolean
}

export interface AkahuConnectionStatus {
  connected: boolean
  user: AkahuUser | null
}

export interface AkahuClipboardPasteResult {
  pastedAppToken: string | null
  pastedUserToken: string | null
}

export interface AkahuRawAccount {
  _id: string
  _connection: string
  name: string
  formatted_account?: string
  status: "ACTIVE" | "INACTIVE"
  type: string
  attributes?: string[]
  balance?: {
    currency: string
    current: number
    available?: number
    limit?: number
    overdrawn?: boolean
  }
  connection: {
    _id: string
    name: string
    logo?: string
  }
  refreshed?: {
    balance?: string
    transactions?: string
    meta?: string
  }
}

export interface AkahuRawTransaction {
  _id: string
  _account: string
  _user: string
  _connection: string
  created_at: string
  updated_at: string
  date: string
  description: string
  amount: number
  balance?: number
  type: string
  merchant?: {
    _id: string
    name: string
    website?: string
    logo?: string
  }
  category?: {
    _id: string
    name: string
    groups?: {
      personal_finance?: {
        _id: string
        name: string
      }
    }
  }
  meta?: {
    particulars?: string
    code?: string
    reference?: string
    other_account?: string
    card_suffix?: string
    conversion?: {
      amount: number
      currency: string
      rate: number
    }
  }
}
