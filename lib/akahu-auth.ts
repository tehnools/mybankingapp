import * as Linking from "expo-linking"
import { akahuClient } from "./akahu-client"
import { SecurityManager } from "./security"
import {
  AkahuPersonalTokensTransformSchema,
  type AkahuAuthCallbackResult,
  type AkahuConnectResult,
} from "../types"

const REDIRECT_URI = Linking.createURL("/auth/callback")

export class AkahuAuth {
  static async openAkahuAccountSetup(): Promise<void> {
    await Linking.openURL("https://my.akahu.nz/developers")
  }

  static async openAkahuDeveloperTokens(): Promise<void> {
    await Linking.openURL("https://my.akahu.nz/developers")
  }

  static async connectWithPersonalTokens(appToken: string, userAccessToken: string): Promise<AkahuConnectResult> {
    const parsedTokens = AkahuPersonalTokensTransformSchema.safeParse({
      appToken,
      userToken: userAccessToken,
    })

    if (!parsedTokens.success) {
      const firstIssue = parsedTokens.error.issues[0]
      return {
        success: false,
        error: firstIssue?.message || "Invalid Akahu App ID Token or User Access Token.",
      }
    }

    try {
      const { cleanAppToken, cleanUserToken } = parsedTokens.data
      await akahuClient.setCredentials(cleanAppToken, cleanUserToken)

      const meResponse = await akahuClient.getMe()
      if (!meResponse?.item) {
        await akahuClient.clearCredentials()
        return {
          success: false,
          error: "Could not verify credentials with Akahu.",
        }
      }

      return {
        success: true,
        user: meResponse.item,
      }
    } catch (error) {
      await akahuClient.clearCredentials()
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to connect to Akahu",
      }
    }
  }

  static async initiateConnection(appToken?: string): Promise<boolean> {
    try {
      const stored = await akahuClient.getStoredCredentials()
      const clientId = appToken || stored.appToken
      if (!clientId) {
        return false
      }

      const state = Math.random().toString(36).substring(2, 15)
      await SecurityManager.storeSecureData("akahu_auth_state", state)

      const authUrl =
        `https://oauth.akahu.io/?` +
        `response_type=code&` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
        `scope=${encodeURIComponent("ENDURING_CONSENT")}&` +
        `state=${state}`

      await Linking.openURL(authUrl)
      return true
    } catch (error) {
      console.error("Failed to initiate Akahu connection:", error)
      return false
    }
  }

  static async handleAuthCallback(url: string): Promise<AkahuAuthCallbackResult> {
    try {
      const { queryParams } = Linking.parse(url)
      const { code, state, error } = (queryParams || {}) as {
        code?: string
        state?: string
        error?: string
      }

      if (error) {
        throw new Error(`OAuth error: ${error}`)
      }

      if (!code || !state) {
        throw new Error("Missing authorization code or state")
      }

      const storedState = await SecurityManager.getSecureData("akahu_auth_state")
      if (state !== storedState) {
        throw new Error("Invalid state parameter")
      }

      const { appToken } = await akahuClient.getStoredCredentials()
      const tokenResponse = await fetch("https://api.akahu.io/v1/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          grant_type: "authorization_code",
          client_id: appToken,
          code,
          redirect_uri: REDIRECT_URI,
        }),
      })

      if (!tokenResponse.ok) {
        throw new Error("Failed to exchange authorization code")
      }

      const tokenData = (await tokenResponse.json()) as { access_token: string }
      await akahuClient.setAccessToken(tokenData.access_token)
      await SecurityManager.deleteSecureData("akahu_auth_state")

      return {
        success: true,
        accessToken: tokenData.access_token,
      }
    } catch (error) {
      console.error("Failed to handle auth callback:", error)
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  static async disconnect(): Promise<boolean> {
    try {
      await akahuClient.clearCredentials()
      return true
    } catch (error) {
      console.error("Failed to disconnect:", error)
      return false
    }
  }

  static async isConnected(): Promise<boolean> {
    try {
      await akahuClient.initialize()
      const me = await akahuClient.getMe()
      return !!me?.item
    } catch {
      return false
    }
  }
}
