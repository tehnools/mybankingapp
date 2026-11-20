import React from "react"
import { AppState, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native"
import { Tabs } from "expo-router"
import { QueryClient, QueryClientProvider, focusManager } from "@tanstack/react-query"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from "@expo/vector-icons"
import { useAkahuStoredSettings, useAutoBiometricUnlock, useUnlockAppSession } from "../hooks/use-akahu-data"
import { useAppStore } from "../lib/store"

// Refetch active queries (including biometric integrity check) whenever app returns to foreground
AppState.addEventListener("change", (status) => {
  focusManager.setFocused(status === "active")
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

const BiometricLockGate = ({ children }: { children: React.ReactNode }): React.JSX.Element => {
  const { data: storedSettings, isLoading } = useAkahuStoredSettings()
  const isSessionUnlocked = useAppStore((s) => s.isSessionUnlocked)
  const unlockMutation = useUnlockAppSession()

  const requiresBiometricUnlock = Boolean(
    storedSettings?.hasStoredTokens && storedSettings?.biometricEnabled && !isSessionUnlocked,
  )

  const autoUnlockQuery = useAutoBiometricUnlock(requiresBiometricUnlock)

  if (isLoading) {
    return (
      <View style={styles.lockContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    )
  }

  if (requiresBiometricUnlock) {
    const errorMessage =
      (unlockMutation.error instanceof Error && unlockMutation.error.message) ||
      (autoUnlockQuery.error instanceof Error && autoUnlockQuery.error.message) ||
      null

    return (
      <View style={styles.lockContainer}>
        <View style={styles.lockCard}>
          <View style={styles.iconCircle}>
            <Ionicons name="lock-closed" size={40} color="#3b82f6" />
          </View>
          <Text style={styles.lockTitle}>App Locked</Text>
          <Text style={styles.lockSubtitle}>
            Authenticate with biometrics to access your NZ Money Manager accounts and Akahu credentials.
          </Text>

          {errorMessage && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color="#dc2626" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.unlockButton}
            onPress={() => unlockMutation.mutate()}
            disabled={unlockMutation.isPending || autoUnlockQuery.isFetching}
          >
            {unlockMutation.isPending || autoUnlockQuery.isFetching ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="finger-print" size={22} color="#ffffff" />
            )}
            <Text style={styles.unlockButtonText}>
              {unlockMutation.isPending || autoUnlockQuery.isFetching ? "Authenticating..." : "Unlock with Biometrics"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return <>{children}</>
}

const RootLayout = (): React.JSX.Element => {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <BiometricLockGate>
          <Tabs
            screenOptions={{
              headerStyle: {
                backgroundColor: "#1a365d",
              },
              headerTintColor: "#ffffff",
              headerTitleStyle: {
                fontWeight: "600",
              },
              tabBarActiveTintColor: "#3b82f6",
              tabBarInactiveTintColor: "#94a3b8",
              tabBarStyle: {
                backgroundColor: "#ffffff",
                borderTopColor: "#e2e8f0",
              },
            }}
          >
            <Tabs.Screen
              name="index"
              options={{
                title: "Home",
                tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
              }}
            />
            <Tabs.Screen
              name="accounts"
              options={{
                title: "Accounts",
                tabBarIcon: ({ color, size }) => <Ionicons name="card-outline" size={size} color={color} />,
              }}
            />
            <Tabs.Screen
              name="settings"
              options={{
                title: "Settings",
                tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
              }}
            />
          </Tabs>
        </BiometricLockGate>
        <StatusBar style="light" />
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}

export default RootLayout

const styles = StyleSheet.create({
  lockContainer: {
    flex: 1,
    backgroundColor: "#1a365d",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  lockCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 28,
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  lockTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
  },
  lockSubtitle: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    width: "100%",
  },
  errorText: {
    color: "#dc2626",
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  unlockButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  unlockButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
})
