import { Stack } from "expo-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"
import AuthGuard from "../components/auth-guard"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
})

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthGuard>
          <Stack
            screenOptions={{
              headerStyle: {
                backgroundColor: "#1a365d",
              },
              headerTintColor: "#ffffff",
              headerTitleStyle: {
                fontWeight: "600",
              },
            }}
          >
            <Stack.Screen name="index" options={{ title: "Money Manager", headerShown: false }} />
            <Stack.Screen name="accounts" options={{ title: "Bank Accounts" }} />
            <Stack.Screen name="transactions" options={{ title: "Transactions" }} />
            <Stack.Screen name="insights" options={{ title: "Financial Insights" }} />
            <Stack.Screen name="settings" options={{ title: "Settings" }} />
            <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
          </Stack>
        </AuthGuard>
        <StatusBar style="auto" />
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}
