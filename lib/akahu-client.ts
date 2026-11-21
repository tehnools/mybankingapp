import * as Crypto from "expo-crypto"
import { AkahuClient as OfficialAkahuSdkClient, type Paginated } from "akahu"
import { SecurityManager } from "./security"
import type {
  AkahuRawAccount,
  AkahuRawPendingTransaction,
  AkahuRawTransaction,
  AkahuTransactionQueryParams,
  AkahuUser,
} from "../types"

/**
 * The official `akahu` SDK uses `uuid.v4()` to generate `Idempotency-Key` headers on POST requests
 * (such as `/refresh`), which requires `globalThis.crypto.getRandomValues` on React Native (Hermes).
 * Polyfill it with `expo-crypto`'s native CSPRNG implementation.
 */
const ensureWebCryptoPolyfill = (): void => {
  const globalScope = globalThis as unknown as {
    crypto?: {
      getRandomValues?: typeof Crypto.getRandomValues
      randomUUID?: typeof Crypto.randomUUID
    }
  }

  if (!globalScope.crypto) {
    globalScope.crypto = {
      getRandomValues: Crypto.getRandomValues,
      randomUUID: Crypto.randomUUID,
    }
    return
  }

  if (typeof globalScope.crypto.getRandomValues !== "function") {
    globalScope.crypto.getRandomValues = Crypto.getRandomValues
  }

  if (typeof globalScope.crypto.randomUUID !== "function") {
    globalScope.crypto.randomUUID = Crypto.randomUUID
  }
}

ensureWebCryptoPolyfill()

export class AkahuClient {
  private appToken: string | null = null
  private accessToken: string | null = null
  private sdkClient: OfficialAkahuSdkClient | null = null

  async initialize(): Promise<void> {
    this.appToken = await SecurityManager.getSecureData("akahu_app_token")
    this.accessToken = await SecurityManager.getSecureData("akahu_access_token")
    this.sdkClient =
      this.appToken && this.appToken.startsWith("app_token_")
        ? new OfficialAkahuSdkClient({ appToken: this.appToken })
        : null
  }

  async setCredentials(appToken: string, accessToken: string): Promise<void> {
    const cleanAppToken = appToken.trim()
    const cleanAccessToken = accessToken.replace(/^Bearer\s+/i, "").trim()

    this.appToken = cleanAppToken
    this.accessToken = cleanAccessToken
    this.sdkClient = new OfficialAkahuSdkClient({ appToken: cleanAppToken })

    await SecurityManager.storeSecureData("akahu_app_token", cleanAppToken)
    await SecurityManager.storeSecureData("akahu_access_token", cleanAccessToken)
  }

  async setAccessToken(token: string): Promise<void> {
    const cleanAccessToken = token.replace(/^Bearer\s+/i, "").trim()
    this.accessToken = cleanAccessToken
    await SecurityManager.storeSecureData("akahu_access_token", cleanAccessToken)
  }

  async getStoredCredentials(): Promise<{ appToken: string | null; accessToken: string | null }> {
    if (!this.appToken || !this.accessToken) {
      await this.initialize()
    }
    return {
      appToken: this.appToken,
      accessToken: this.accessToken,
    }
  }

  async clearCredentials(): Promise<void> {
    this.appToken = null
    this.accessToken = null
    this.sdkClient = null
    await SecurityManager.deleteSecureData("akahu_app_token")
    await SecurityManager.deleteSecureData("akahu_access_token")
  }

  private async getClientAndToken(): Promise<{ sdk: OfficialAkahuSdkClient; userToken: string }> {
    if (!this.appToken || !this.accessToken || !this.sdkClient) {
      await this.initialize()
    }

    if (!this.appToken || !this.accessToken || !this.sdkClient) {
      throw new Error("Missing Akahu App Token or User Access Token")
    }

    return { sdk: this.sdkClient, userToken: this.accessToken }
  }

  async getMe(): Promise<{ success: true; item: AkahuUser }> {
    const { sdk, userToken } = await this.getClientAndToken()
    const item = await sdk.users.get(userToken)
    return { success: true, item }
  }

  async getAccounts(): Promise<{ success: true; items: AkahuRawAccount[] }> {
    const { sdk, userToken } = await this.getClientAndToken()
    const items = await sdk.accounts.list(userToken)
    return { success: true, items }
  }

  async getAccountById(accountId: string): Promise<{ success: true; item: AkahuRawAccount }> {
    const { sdk, userToken } = await this.getClientAndToken()
    const item = await sdk.accounts.get(userToken, accountId)
    return { success: true, item }
  }

  async getTransactions(
    accountId?: string,
    params?: AkahuTransactionQueryParams,
  ): Promise<{
    success: true
    items: AkahuRawTransaction[]
    cursor?: Paginated<AkahuRawTransaction>["cursor"]
  }> {
    const { sdk, userToken } = await this.getClientAndToken()
    const paginated = accountId
      ? await sdk.accounts.listTransactions(userToken, accountId, params)
      : await sdk.transactions.list(userToken, params)
    return {
      success: true,
      items: paginated.items,
      cursor: paginated.cursor,
    }
  }

  async getPendingTransactions(
    accountId?: string,
  ): Promise<{ success: true; items: AkahuRawPendingTransaction[] }> {
    const { sdk, userToken } = await this.getClientAndToken()
    const items = accountId
      ? await sdk.accounts.listPendingTransactions(userToken, accountId)
      : await sdk.transactions.listPending(userToken)
    return { success: true, items }
  }

  async refreshAccounts(accountOrConnectionId?: string): Promise<{ success: true }> {
    const { sdk, userToken } = await this.getClientAndToken()
    if (!accountOrConnectionId) {
      await sdk.accounts.refreshAll(userToken)
    } else if (accountOrConnectionId.startsWith("conn_")) {
      await sdk.connections.refresh(userToken, accountOrConnectionId)
    } else {
      await sdk.accounts.refresh(userToken, accountOrConnectionId)
    }
    return { success: true }
  }
}

export const akahuClient = new AkahuClient()
