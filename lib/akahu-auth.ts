import * as Linking from "expo-linking"
import { akahuClient } from "./akahu-client"
import { SecurityManager } from "./security"

const REDIRECT_URI = Linking.createURL("/auth/callback")

export class AkahuAuth {
  /**
   * Opens the Akahu portal so the user can sign up and connect their NZ bank accounts.
   */
  static async openAkahuAccountSetup() {
    await Linking.openURL("https://my.akahu.nz/connections")
  }

  /**
   * Opens the Akahu Personal App developer page so the user can create & copy their App Token and User Token.
   */
  static async openAkahuDeveloperTokens() {
    await Linking.openURL("https://my.akahu.nz/developers")
  }

  /**
   * Validates and saves the user's Akahu Personal App credentials (`app_token_...` and `user_token_...`).
   */
  static async connectWithPersonalTokens(appToken: string, userAccessToken: string) {
    try {
      const cleanAppToken = appToken.trim()
      const cleanUserToken = userAccessToken.replace(/^Bearer\s+/i, "").trim()

      if (!cleanAppToken.startsWith("app_token_")) {
        return {
          success: false,
          error: "App ID Token must start with 'app_token_'",
        }
      }

      if (!cleanUserToken.startsWith("user_token_")) {
        return {
          success: false,
          error: "User Access Token must start with 'user_token_'",
        }
      }

      await akahuClient.setCredentials(cleanAppToken, cleanUserToken)

      // Verify credentials by calling /me
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

  /**
   * Optional OAuth2 flow for commercial Akahu apps.
   */
  static async initiateConnection(appToken?: string) {
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

  static async handleAuthCallback(url: string) {
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

      const tokenData = await tokenResponse.json()
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

  static async disconnect() {
    try {
      await akahuClient.clearCredentials()
      return true
    } catch (error) {
      console.error("Failed to disconnect:", error)
      return false
    }
  }

  static async isConnected() {
    try {
      await akahuClient.initialize()
      const me = await akahuClient.getMe()
      return !!me?.item
    } catch (error) {
      return false
    }
  }
}
