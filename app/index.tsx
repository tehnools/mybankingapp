import React from "react"
import { View, StyleSheet } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { Text } from "../components/app-text"
import { useAkahuConnection } from "../hooks/use-akahu-data"
import { useAppTheme } from "../lib/theme"

const HomeScreen = (): React.JSX.Element => {
  const { colors } = useAppTheme()
  const { data: connectionStatus, isLoading } = useAkahuConnection()
  const isConnected = !!connectionStatus?.connected

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.iconBadge, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name="wallet-outline" size={38} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>NZ Money Manager</Text>
      <Text style={[styles.subtitle, { color: colors.subtext }]}>
        {isLoading
          ? "Checking Akahu connection..."
          : isConnected
            ? `Connected to Akahu${connectionStatus?.user?.email ? ` (${connectionStatus.user.email})` : ""}`
            : "Not connected yet — open the Settings tab to add your Akahu tokens."}
      </Text>
    </View>
  )
}

export default HomeScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  iconBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
})
