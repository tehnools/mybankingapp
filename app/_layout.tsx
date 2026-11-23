import React from "react"
import { View, StyleSheet, ActivityIndicator, useColorScheme } from "react-native"
import { Tabs, ThemeProvider } from "expo-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from "@expo/vector-icons"
import { PinPad } from "../components/pin-pad"
import {
  useAutoBiometricUnlock,
  useBackgroundTransactionsSync,
  useUnlockAppSession,
  useUnlockAppWithPin,
} from "../hooks/use-akahu-data"
import { useAppLifecycleState } from "../hooks/use-app-state"
import { useLockScreenStore } from "../lib/store"
import { DarkAppTheme, LightAppTheme, useAppTheme } from "../lib/theme"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

const AppLockGate = ({ children }: { children: React.ReactNode }): React.JSX.Element => {
  const { colors } = useAppTheme()
  const { requiresUnlock, biometricEnabled, isLoading } = useAppLifecycleState()
  const { pinInput, setPinInput } = useLockScreenStore()

  const unlockBioMutation = useUnlockAppSession()
  const unlockPinMutation = useUnlockAppWithPin()
  const autoUnlockQuery = useAutoBiometricUnlock(requiresUnlock && biometricEnabled)

  if (isLoading) {
    return (
      <View style={[styles.lockContainer, { backgroundColor: colors.headerBackground }]}>
        <ActivityIndicator size="large" color={colors.primary} />
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
      <View style={[styles.lockContainer, { backgroundColor: colors.headerBackground }]}>
        <View style={[styles.lockCard, { backgroundColor: colors.card }]}>
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

const ThemedTabs = (): React.JSX.Element => {
  const { colors } = useAppTheme()
  useBackgroundTransactionsSync()

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.headerBackground,
        },
        headerTintColor: colors.headerText,
        headerTitleStyle: {
          fontWeight: "600",
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ focused, size }: { focused: boolean; size: number }): React.JSX.Element => (
            <Ionicons name="home-outline" size={size} color={focused ? colors.primary : colors.muted} />
          ),
        }}
      />
      <Tabs.Screen
        name="accounts"
        options={{
          title: "Accounts",
          tabBarIcon: ({ focused, size }: { focused: boolean; size: number }): React.JSX.Element => (
            <Ionicons name="card-outline" size={size} color={focused ? colors.primary : colors.muted} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ focused, size }: { focused: boolean; size: number }): React.JSX.Element => (
            <Ionicons name="settings-outline" size={size} color={focused ? colors.primary : colors.muted} />
          ),
        }}
      />
    </Tabs>
  )
}

const RootLayout = (): React.JSX.Element => {
  const colorScheme = useColorScheme()
  const activeTheme = colorScheme === "dark" ? DarkAppTheme : LightAppTheme

  return (
    <SafeAreaProvider>
      <ThemeProvider value={activeTheme}>
        <QueryClientProvider client={queryClient}>
          <AppLockGate>
            <ThemedTabs />
          </AppLockGate>
          <StatusBar style="light" />
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  )
}

export default RootLayout

const styles = StyleSheet.create({
  lockContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  lockCard: {
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
