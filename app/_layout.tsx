import { Tabs } from "expo-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { StatusBar } from "expo-status-bar"
import { Ionicons } from "@expo/vector-icons"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
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
        <StatusBar style="light" />
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}
