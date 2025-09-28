"use client"

import { useState, useEffect } from "react"
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, ScrollView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useAuthStore } from "../store/use-auth-store"
import { SecurityManager } from "../lib/security"
import { AkahuAuth } from "../lib/akahu-auth"

export default function SettingsScreen() {
  const { biometricEnabled, enableBiometric, disableBiometric, logout } = useAuthStore()
  const [securityInfo, setSecurityInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const loadSecurityInfo = async () => {
      const info = await SecurityManager.initializeSecurity()
      setSecurityInfo(info)
    }
    loadSecurityInfo()
  }, [])

  const handleBiometricToggle = async (enabled: boolean) => {
    setIsLoading(true)
    try {
      if (enabled) {
        const success = await enableBiometric()
        if (!success) {
          Alert.alert("Failed", "Could not enable biometric authentication")
        }
      } else {
        const success = await disableBiometric()
        if (!success) {
          Alert.alert("Failed", "Could not disable biometric authentication")
        }
      }
    } catch (error) {
      Alert.alert("Error", "An error occurred while updating biometric settings")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisconnectBanks = async () => {
    Alert.alert(
      "Disconnect Banks",
      "This will remove all bank connections and clear your financial data. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: async () => {
            await AkahuAuth.disconnect()
            Alert.alert("Success", "Bank connections have been removed")
          },
        },
      ],
    )
  }

  const handleClearAllData = async () => {
    Alert.alert(
      "Clear All Data",
      "This will permanently delete all your data including bank connections, transactions, and settings. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All Data",
          style: "destructive",
          onPress: async () => {
            await SecurityManager.clearAllSecureData()
            await logout()
            Alert.alert("Success", "All data has been cleared")
          },
        },
      ],
    )
  }

  const settingSections = [
    {
      title: "Security",
      items: [
        {
          icon: "finger-print",
          title: "Biometric Authentication",
          subtitle: securityInfo?.isEnrolled ? "Use fingerprint or face recognition" : "Not available on this device",
          type: "switch" as const,
          value: biometricEnabled,
          onToggle: handleBiometricToggle,
          disabled: !securityInfo?.isEnrolled || isLoading,
        },
        {
          icon: "time",
          title: "Auto-lock",
          subtitle: "Lock app after 15 minutes of inactivity",
          type: "info" as const,
        },
        {
          icon: "shield-checkmark",
          title: "Data Encryption",
          subtitle: "All data is encrypted on your device",
          type: "info" as const,
        },
      ],
    },
    {
      title: "Bank Connections",
      items: [
        {
          icon: "unlink",
          title: "Disconnect Banks",
          subtitle: "Remove all bank connections",
          type: "button" as const,
          onPress: handleDisconnectBanks,
          color: "#f59e0b",
        },
      ],
    },
    {
      title: "Data Management",
      items: [
        {
          icon: "trash",
          title: "Clear All Data",
          subtitle: "Permanently delete all app data",
          type: "button" as const,
          onPress: handleClearAllData,
          color: "#dc2626",
        },
      ],
    },
    {
      title: "About",
      items: [
        {
          icon: "information-circle",
          title: "App Version",
          subtitle: "1.0.0",
          type: "info" as const,
        },
        {
          icon: "document-text",
          title: "Privacy Policy",
          subtitle: "How we protect your data",
          type: "button" as const,
          onPress: () =>
            Alert.alert(
              "Privacy Policy",
              "Your privacy is our priority. All data is stored locally on your device and encrypted.",
            ),
        },
        {
          icon: "help-circle",
          title: "Support",
          subtitle: "Get help with the app",
          type: "button" as const,
          onPress: () => Alert.alert("Support", "For support, please contact us at support@nzmoney.app"),
        },
      ],
    },
  ]

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Manage your app preferences and security</Text>
        </View>

        {settingSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={[styles.settingItem, item.type === "info" && styles.disabledItem]}
                  onPress={item.onPress}
                  disabled={item.type === "info" || item.disabled}
                >
                  <View style={[styles.settingIcon, { backgroundColor: `${item.color || "#3b82f6"}15` }]}>
                    <Ionicons name={item.icon as any} size={20} color={item.color || "#3b82f6"} />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={styles.settingTitle}>{item.title}</Text>
                    <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
                  </View>
                  {item.type === "switch" && (
                    <Switch
                      value={item.value}
                      onValueChange={item.onToggle}
                      disabled={item.disabled}
                      trackColor={{ false: "#f1f5f9", true: "#3b82f6" }}
                      thumbColor={item.value ? "#ffffff" : "#ffffff"}
                    />
                  )}
                  {item.type === "button" && <Ionicons name="chevron-forward" size={16} color="#9ca3af" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Ionicons name="log-out" size={20} color="#dc2626" />
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
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
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionContent: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  disabledItem: {
    opacity: 0.6,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1e293b",
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: "#64748b",
  },
  logoutButton: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  logoutButtonText: {
    color: "#dc2626",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
})
