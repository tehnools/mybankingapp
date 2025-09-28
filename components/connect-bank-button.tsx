"use client"

import { useState } from "react"
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { AkahuAuth } from "../lib/akahu-auth"

interface ConnectBankButtonProps {
  onConnectionStart?: () => void
  style?: any
}

export default function ConnectBankButton({ onConnectionStart, style }: ConnectBankButtonProps) {
  const [isConnecting, setIsConnecting] = useState(false)

  const handleConnect = async () => {
    try {
      setIsConnecting(true)
      onConnectionStart?.()

      const success = await AkahuAuth.initiateConnection()

      if (!success) {
        Alert.alert("Connection Failed", "Unable to start the bank connection process. Please try again.", [
          { text: "OK" },
        ])
      }
    } catch (error) {
      console.error("Connection error:", error)
      Alert.alert("Connection Error", "An error occurred while connecting to your bank. Please try again.", [
        { text: "OK" },
      ])
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <TouchableOpacity style={[styles.button, style]} onPress={handleConnect} disabled={isConnecting}>
      {isConnecting ? (
        <ActivityIndicator size="small" color="#ffffff" />
      ) : (
        <Ionicons name="add-circle-outline" size={24} color="#ffffff" />
      )}
      <Text style={styles.buttonText}>{isConnecting ? "Connecting..." : "Connect Bank Account"}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
})
