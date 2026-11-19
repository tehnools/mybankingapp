import { SecurityManager } from "./security"

const AKAHU_BASE_URL = "https://api.akahu.io/v1"

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

export class AkahuClient {
  private appToken: string | null = null
  private accessToken: string | null = null

  async initialize() {
    this.appToken = await SecurityManager.getSecureData("akahu_app_token")
    this.accessToken = await SecurityManager.getSecureData("akahu_access_token")
  }

  async setCredentials(appToken: string, accessToken: string) {
    const cleanAppToken = appToken.trim()
    const cleanAccessToken = accessToken.replace(/^Bearer\s+/i, "").trim()

    this.appToken = cleanAppToken
    this.accessToken = cleanAccessToken

    await SecurityManager.storeSecureData("akahu_app_token", cleanAppToken)
    await SecurityManager.storeSecureData("akahu_access_token", cleanAccessToken)
  }

  async setAccessToken(token: string) {
    const cleanAccessToken = token.replace(/^Bearer\s+/i, "").trim()
    this.accessToken = cleanAccessToken
    await SecurityManager.storeSecureData("akahu_access_token", cleanAccessToken)
  }

  async getStoredCredentials() {
    if (!this.appToken || !this.accessToken) {
      await this.initialize()
    }
    return {
      appToken: this.appToken,
      accessToken: this.accessToken,
    }
  }

  async clearCredentials() {
    this.appToken = null
    this.accessToken = null
    await SecurityManager.deleteSecureData("akahu_app_token")
    await SecurityManager.deleteSecureData("akahu_access_token")
  }

  private async makeRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.appToken || !this.accessToken) {
      await this.initialize()
    }

    if (!this.appToken || !this.accessToken) {
      throw new Error("Missing Akahu App Token or User Access Token")
    }

    const response = await fetch(`${AKAHU_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "X-Akahu-Id": this.appToken,
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    const data = await response.json().catch(() => null)

    if (!response.ok || (data && data.success === false)) {
      const errorMessage = data?.message || `Akahu API error (${response.status})`
      throw new Error(errorMessage)
    }

    return data as T
  }

  async getMe() {
    return this.makeRequest<{
      success: boolean
      item: { _id: string; email?: string; first_name?: string; last_name?: string }
    }>("/me")
  }

  async getAccounts() {
    return this.makeRequest<{ success: boolean; items: AkahuRawAccount[] }>("/accounts")
  }

  async getAccountById(accountId: string) {
    return this.makeRequest<{ success: boolean; item: AkahuRawAccount }>(`/accounts/${encodeURIComponent(accountId)}`)
  }

  async getTransactions(
    accountId?: string,
    params?: {
      start?: string
      end?: string
      cursor?: string
    },
  ) {
    const queryParams = new URLSearchParams()
    if (params?.start) queryParams.append("start", params.start)
    if (params?.end) queryParams.append("end", params.end)
    if (params?.cursor) queryParams.append("cursor", params.cursor)

    const basePath = accountId ? `/accounts/${encodeURIComponent(accountId)}/transactions` : "/transactions"
    const query = queryParams.toString()

    return this.makeRequest<{
      success: boolean
      items: AkahuRawTransaction[]
      cursor?: { next?: string | null }
    }>(`${basePath}${query ? `?${query}` : ""}`)
  }

  async getPendingTransactions(accountId?: string) {
    const basePath = accountId
      ? `/accounts/${encodeURIComponent(accountId)}/transactions/pending`
      : "/transactions/pending"
    return this.makeRequest<{ success: boolean; items: Omit<AkahuRawTransaction, "_id">[] }>(basePath)
  }

  async refreshAccounts(accountOrConnectionId?: string) {
    const path = accountOrConnectionId ? `/refresh/${encodeURIComponent(accountOrConnectionId)}` : "/refresh"
    return this.makeRequest<{ success: boolean }>(path, { method: "POST" })
  }
}

export const akahuClient = new AkahuClient()
