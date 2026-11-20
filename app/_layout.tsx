import React from "react"
import { View, StyleSheet, ActivityIndicator, type ColorValue } from "react-native"
import { Tabs } from "expo-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from "@expo/vector-icons"
import { PinPad } from "../components/pin-pad"
import { useAutoBiometricUnlock, useUnlockAppSession, useUnlockAppWithPin } from "../hooks/use-akahu-data"
import { useAppLifecycleState } from "../hooks/use-app-state"
import { useLockScreenStore } from "../lib/store"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

const AppLockGate = ({ children }: { children: React.ReactNode }): React.JSX.Element => {
  const { requiresUnlock, biometricEnabled, isLoading } = useAppLifecycleState()
  const { pinInput, setPinInput } = useLockScreenStore()

  const unlockBioMutation = useUnlockAppSession()
  const unlockPinMutation = useUnlockAppWithPin()
  const autoUnlockQuery = useAutoBiometricUnlock(requiresUnlock && biometricEnabled)

  if (isLoading) {
    return (
      <View style={styles.lockContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    )
  }

  if (requiresUnlock) {
    const errorMessage =
      (unlockPinMutation.error instanceof Error && unlockPinMutation.error.message) ||
      (unlockBioMutation.error instanceof Error && unlockBioMutation.error.message) ||
      (autoUnlockQuery.error instanceof Error && autoUnlockQuery.error.message) ||
      null

    const isAuthenticating = unlockBioMutation.isPending || unlockPinMutation.isPending || autoUnlockQuery.isFetching

    return (
      <View style={styles.lockContainer}>
        <View style={styles.lockCard}>
          <PinPad
            title="Unlock NZ Money Manager"
            subtitle={
              biometricEnabled
                ? "Use biometrics or enter your 6-digit PIN to access your accounts."
                : "Enter your 6-digit PIN to access your accounts."
            }
            value={pinInput}
            onChange={(nextPin: string): void => {
              unlockPinMutation.reset()
              setPinInput(nextPin)
            }}
            onComplete={(completedPin: string): void => {
              unlockPinMutation.mutate(completedPin)
            }}
            errorMessage={errorMessage}
            isLoading={isAuthenticating}
            showBiometricButton={biometricEnabled}
            onBiometricPress={(): void => {
              unlockPinMutation.reset()
              unlockBioMutation.mutate()
            }}
          />
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
        <AppLockGate>
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
                tabBarIcon: ({ color, size }: { color: ColorValue; size: number }): React.JSX.Element => (
                  <Ionicons name="home-outline" size={size} color={color ?? undefined} />
                ),
              }}
            />
            <Tabs.Screen
              name="accounts"
              options={{
                title: "Accounts",
                tabBarIcon: ({ color, size }: { color: ColorValue; size: number }): React.JSX.Element => (
                  <Ionicons name="card-outline" size={size} color={color ?? undefined} />
                ),
              }}
            />
            <Tabs.Screen
              name="settings"
              options={{
                title: "Settings",
                tabBarIcon: ({ color, size }: { color: ColorValue; size: number }): React.JSX.Element => (
                  <Ionicons name="settings-outline" size={size} color={color ?? undefined} />
                ),
              }}
            />
          </Tabs>
        </AppLockGate>
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
    padding: 20,
  },
  lockCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 24,
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
})
