import React from "react"
import { View, Text, StyleSheet } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useAkahuConnection } from "../hooks/use-akahu-data"

const HomeScreen = (): React.JSX.Element => {
  const { data: connectionStatus, isLoading } = useAkahuConnection()
  const isConnected = !!connectionStatus?.connected

  return (
    <View style={styles.container}>
      <Ionicons name="wallet-outline" size={48} color="#94a3b8" />
      <Text style={styles.title}>NZ Money Manager</Text>
      <Text style={styles.subtitle}>
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
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1e293b",
    marginTop: 12,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 22,
  },
})
