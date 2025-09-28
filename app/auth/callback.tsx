"use client"

import { useEffect } from "react"
import { View, Text, StyleSheet, ActivityIndicator } from "react-native"
import { useRouter, useLocalSearchParams } from "expo-router"
import { AkahuAuth } from "../../lib/akahu-auth"
import { useAppStore } from "../../lib/store"

export default function AuthCallbackScreen() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const { setConnected } = useAppStore()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Reconstruct the full URL with query parameters
        const url = `nz-money-manager://auth/callback?${new URLSearchParams(params as Record<string, string>).toString()}`

        const result = await AkahuAuth.handleAuthCallback(url)

        if (result.success) {
          setConnected(true)
          router.replace("/accounts")
        } else {
          console.error("Auth callback failed:", result.error)
          router.replace("/")
        }
      } catch (error) {
        console.error("Auth callback error:", error)
        router.replace("/")
      }
    }

    handleCallback()
  }, [params, router, setConnected])

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#3b82f6" />
      <Text style={styles.text}>Connecting to your banks...</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: "#64748b",
  },
})
