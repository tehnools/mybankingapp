import * as Linking from "expo-linking"
import * as SecureStore from "expo-secure-store"
import { akahuClient } from "./akahu-client"

const AKAHU_APP_TOKEN = "app_token_your_akahu_app_token_here" // Replace with your Akahu app token
const REDIRECT_URI = Linking.createURL("/auth/callback")

export class AkahuAuth {
  static async initiateConnection() {
    try {
      // Generate a random state parameter for security
      const state = Math.random().toString(36).substring(2, 15)
      await SecureStore.setItemAsync("akahu_auth_state", state)

      // Construct Akahu OAuth URL
      const authUrl =
        `https://oauth.akahu.io/?` +
        `response_type=code&` +
        `client_id=${AKAHU_APP_TOKEN}&` +
        `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
        `scope=ACCOUNTS:READ TRANSACTIONS:READ&` +
        `state=${state}`

      // Open the OAuth URL in the browser
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
      const { code, state, error } = queryParams as {
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

      // Verify state parameter
      const storedState = await SecureStore.getItemAsync("akahu_auth_state")
      if (state !== storedState) {
        throw new Error("Invalid state parameter")
      }

      // Exchange authorization code for access token
      const tokenResponse = await fetch("https://api.akahu.io/v1/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          grant_type: "authorization_code",
          client_id: AKAHU_APP_TOKEN,
          code: code,
          redirect_uri: REDIRECT_URI,
        }),
      })

      if (!tokenResponse.ok) {
        throw new Error("Failed to exchange authorization code")
      }

      const tokenData = await tokenResponse.json()

      // Store the access token securely
      await akahuClient.setAccessToken(tokenData.access_token)

      // Clean up state
      await SecureStore.deleteItemAsync("akahu_auth_state")

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
      await akahuClient.clearAccessToken()
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
      return !!me
    } catch (error) {
      return false
    }
  }
}
