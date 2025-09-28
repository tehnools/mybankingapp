import * as SecureStore from "expo-secure-store"

const AKAHU_BASE_URL = "https://api.akahu.io/v1"

export class AkahuClient {
  private accessToken: string | null = null

  async initialize() {
    this.accessToken = await SecureStore.getItemAsync("akahu_access_token")
  }

  async setAccessToken(token: string) {
    this.accessToken = token
    await SecureStore.setItemAsync("akahu_access_token", token)
  }

  async clearAccessToken() {
    this.accessToken = null
    await SecureStore.deleteItemAsync("akahu_access_token")
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    if (!this.accessToken) {
      throw new Error("No access token available")
    }

    const response = await fetch(`${AKAHU_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`Akahu API error: ${response.status}`)
    }

    return response.json()
  }

  async getAccounts() {
    return this.makeRequest("/accounts")
  }

  async getTransactions(
    accountId?: string,
    params?: {
      start?: string
      end?: string
      size?: number
    },
  ) {
    const queryParams = new URLSearchParams()
    if (accountId) queryParams.append("account", accountId)
    if (params?.start) queryParams.append("start", params.start)
    if (params?.end) queryParams.append("end", params.end)
    if (params?.size) queryParams.append("size", params.size.toString())

    const query = queryParams.toString()
    return this.makeRequest(`/transactions${query ? `?${query}` : ""}`)
  }

  async getMe() {
    return this.makeRequest("/me")
  }
}

export const akahuClient = new AkahuClient()
