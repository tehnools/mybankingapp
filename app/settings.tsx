import React, { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useQueryClient } from "@tanstack/react-query"
import { AkahuAuth } from "../lib/akahu-auth"
import { akahuClient } from "../lib/akahu-client"
import { useAkahuConnection } from "../hooks/use-akahu-data"
import { useAppStore } from "../lib/store"

export default function SettingsScreen() {
  const queryClient = useQueryClient()
  const { setConnected } = useAppStore()
  const { data: connectionStatus, isLoading: isCheckingConnection } = useAkahuConnection()

  const [appToken, setAppToken] = useState("")
  const [userToken, setUserToken] = useState("")
  const [showUserToken, setShowUserToken] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{
    type: "error" | "success"
    text: string
  } | null>(null)

  useEffect(() => {
    const loadStoredTokens = async () => {
      const stored = await akahuClient.getStoredCredentials()
      if (stored.appToken) setAppToken(stored.appToken)
      if (stored.accessToken) setUserToken(stored.accessToken)
    }
    loadStoredTokens()
  }, [])

  const handleSaveAndVerify = async () => {
    setStatusMessage(null)

    if (!appToken.trim() || !userToken.trim()) {
      setStatusMessage({
        type: "error",
        text: "Please enter both your App ID Token and User Access Token.",
      })
      return
    }

    setIsSaving(true)
    try {
      const result = await AkahuAuth.connectWithPersonalTokens(appToken, userToken)

      if (!result.success) {
        setStatusMessage({
          type: "error",
          text: result.error || "Could not verify tokens with Akahu.",
        })
        return
      }

      setConnected(true)
      await queryClient.invalidateQueries({ queryKey: ["akahu"] })
      setStatusMessage({
        type: "success",
        text: `Connected to Akahu${result.user?.email ? ` as ${result.user.email}` : ""}!`,
      })
    } catch (error) {
      setStatusMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to save Akahu tokens.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDisconnect = async () => {
    const performDisconnect = async () => {
      await AkahuAuth.disconnect()
      setAppToken("")
      setUserToken("")
      setConnected(false)
      setStatusMessage(null)
      await queryClient.invalidateQueries({ queryKey: ["akahu"] })
    }

    if (Platform.OS === "web") {
      await performDisconnect()
      return
    }

    Alert.alert("Disconnect Akahu", "Remove your saved Akahu tokens from this device?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Disconnect",
        style: "destructive",
        onPress: performDisconnect,
      },
    ])
  }

  const isConnected = !!connectionStatus?.connected

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Connection Status Card */}
        <View style={[styles.statusCard, isConnected ? styles.statusCardConnected : styles.statusCardDisconnected]}>
          <Ionicons
            name={isConnected ? "checkmark-circle" : "information-circle"}
            size={24}
            color={isConnected ? "#059669" : "#64748b"}
          />
          <View style={styles.statusTextWrapper}>
            <Text style={styles.statusTitle}>
              {isCheckingConnection ? "Checking connection..." : isConnected ? "Akahu Connected" : "Not Connected"}
            </Text>
            <Text style={styles.statusSubtitle}>
              {isConnected
                ? connectionStatus?.user?.email || `User ID: ${connectionStatus?.user?._id}`
                : "Enter your Akahu Personal App tokens below"}
            </Text>
          </View>
        </View>

        {/* Akahu Token Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Akahu Credentials</Text>
          <Text style={styles.cardDescription}>
            Get your Personal App tokens from my.akahu.nz/developers and save them securely on this device.
          </Text>

          <View style={styles.helperLinksRow}>
            <TouchableOpacity style={styles.linkButton} onPress={() => AkahuAuth.openAkahuAccountSetup()}>
              <Ionicons name="open-outline" size={16} color="#3b82f6" />
              <Text style={styles.linkButtonText}>1. Link Banks</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkButton} onPress={() => AkahuAuth.openAkahuDeveloperTokens()}>
              <Ionicons name="key-outline" size={16} color="#3b82f6" />
              <Text style={styles.linkButtonText}>2. Get Tokens</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>App ID Token (X-Akahu-Id)</Text>
            <TextInput
              style={styles.input}
              placeholder="app_token_..."
              placeholderTextColor="#94a3b8"
              value={appToken}
              onChangeText={setAppToken}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>User Access Token (Bearer)</Text>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="user_token_..."
                placeholderTextColor="#94a3b8"
                value={userToken}
                onChangeText={setUserToken}
                secureTextEntry={!showUserToken}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={styles.eyeButton} onPress={() => setShowUserToken((v) => !v)}>
                <Ionicons name={showUserToken ? "eye-off-outline" : "eye-outline"} size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>

          {statusMessage && (
            <View
              style={[styles.messageBanner, statusMessage.type === "error" ? styles.errorBanner : styles.successBanner]}
            >
              <Ionicons
                name={statusMessage.type === "error" ? "alert-circle" : "checkmark-circle"}
                size={18}
                color={statusMessage.type === "error" ? "#dc2626" : "#059669"}
              />
              <Text
                style={[styles.messageText, statusMessage.type === "error" ? styles.errorText : styles.successText]}
              >
                {statusMessage.text}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.buttonDisabled]}
            onPress={handleSaveAndVerify}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="save-outline" size={20} color="#ffffff" />
            )}
            <Text style={styles.saveButtonText}>{isSaving ? "Verifying..." : "Verify & Save Tokens"}</Text>
          </TouchableOpacity>

          {isConnected && (
            <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnect}>
              <Ionicons name="trash-outline" size={18} color="#dc2626" />
              <Text style={styles.disconnectButtonText}>Clear Saved Tokens</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  statusCardConnected: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  statusCardDisconnected: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
  },
  statusTextWrapper: {
    marginLeft: 12,
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  statusSubtitle: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20,
    marginBottom: 16,
  },
  helperLinksRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  linkButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  linkButtonText: {
    color: "#3b82f6",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 6,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1e293b",
  },
  passwordWrapper: {
    position: "relative",
    justifyContent: "center",
  },
  passwordInput: {
    paddingRight: 44,
  },
  eyeButton: {
    position: "absolute",
    right: 12,
    padding: 4,
  },
  messageBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
    marginBottom: 12,
    borderWidth: 1,
  },
  errorBanner: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  successBanner: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  messageText: {
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  errorText: {
    color: "#dc2626",
  },
  successText: {
    color: "#059669",
  },
  saveButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  disconnectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 12,
  },
  disconnectButtonText: {
    color: "#dc2626",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
})
