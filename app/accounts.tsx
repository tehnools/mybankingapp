import React from "react"
import { View, StyleSheet } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { Text } from "../components/app-text"

const AccountsScreen = (): React.JSX.Element => {
  return (
    <View style={styles.container}>
      <Ionicons name="card-outline" size={48} color="#94a3b8" />
      <Text style={styles.title}>Bank Accounts</Text>
      <Text style={styles.subtitle}>
        Account listing and adding will be enabled in Phase 2 once your Akahu tokens are saved in Settings.
      </Text>
    </View>
  )
}

export default AccountsScreen

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
