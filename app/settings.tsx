import React from "react"
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Switch,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { AkahuAuth } from "../lib/akahu-auth"
import {
  useAkahuConnection,
  useAkahuStoredSettings,
  useSaveAkahuTokens,
  useUnlockCredentialsForm,
  useWipeAkahuTokens,
} from "../hooks/use-akahu-data"
import { useSettingsFormStore } from "../lib/store"

function maskToken(token: string, prefixLen = 12) {
  if (!token) return ""
  if (token.length <= prefixLen + 4) return token
  return `${token.slice(0, prefixLen)}••••••••••••${token.slice(-2)}`
}

export default function SettingsScreen() {
  const { data: connectionStatus, isLoading: isCheckingConnection } = useAkahuConnection()
  const { data: storedSettings } = useAkahuStoredSettings()

  const saveMutation = useSaveAkahuTokens()
  const unlockMutation = useUnlockCredentialsForm()
  const wipeMutation = useWipeAkahuTokens()

  const {
    draftAppToken,
    draftUserToken,
    showUserToken,
    isUnlockedForEditing,
    showWipeModal,
    setDraftAppToken,
    setDraftUserToken,
    toggleShowUserToken,
    setShowWipeModal,
  } = useSettingsFormStore()

  // Derived state directly from TanStack Query + Zustand
  const hasStoredTokens = Boolean(storedSettings?.hasStoredTokens)
  const isFormLocked = hasStoredTokens && !isUnlockedForEditing
  const biometricEnabled = Boolean(storedSettings?.biometricEnabled)
  const isConnected = Boolean(connectionStatus?.connected)

  const activeAppToken = isFormLocked ? storedSettings?.appToken || "" : draftAppToken
  const activeUserToken = isFormLocked ? storedSettings?.accessToken || "" : draftUserToken

  // Derive status feedback directly from TanStack Query mutation states
  const activeError =
    (saveMutation.error instanceof Error && saveMutation.error.message) ||
    (unlockMutation.error instanceof Error && unlockMutation.error.message) ||
    (wipeMutation.error instanceof Error && wipeMutation.error.message) ||
    null

  const activeSuccess = saveMutation.isSuccess
    ? `Tokens verified & locked with biometrics${saveMutation.data?.email ? ` (${saveMutation.data.email})` : ""}!`
    : unlockMutation.isSuccess && isUnlockedForEditing
      ? "Form unlocked for editing."
      : wipeMutation.isSuccess && !hasStoredTokens
        ? "Biometrics turned off and all Akahu tokens have been wiped from storage."
        : null

  const clearMutationStates = () => {
    saveMutation.reset()
    unlockMutation.reset()
    wipeMutation.reset()
  }

  const handleSave = () => {
    clearMutationStates()
    saveMutation.mutate({ appToken: activeAppToken, userToken: activeUserToken })
  }

  const handleUnlockToEdit = () => {
    clearMutationStates()
    unlockMutation.mutate()
  }

  const handleBiometricToggleAttempt = (nextValue: boolean) => {
    clearMutationStates()
    if (nextValue) {
      saveMutation.mutate({ appToken: activeAppToken, userToken: activeUserToken })
    } else {
      setShowWipeModal(true)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Connection Status Card */}
        <View style={[styles.statusCard, isConnected ? styles.statusCardConnected : styles.statusCardDisconnected]}>
          <Ionicons
            name={isConnected ? "shield-checkmark" : "information-circle"}
            size={24}
            color={isConnected ? "#059669" : "#64748b"}
          />
          <View style={styles.statusTextWrapper}>
            <Text style={styles.statusTitle}>
              {isCheckingConnection
                ? "Checking connection..."
                : isConnected
                  ? "Akahu Connected & Locked"
                  : "Not Connected"}
            </Text>
            <Text style={styles.statusSubtitle}>
              {isConnected
                ? connectionStatus?.user?.email || `User ID: ${connectionStatus?.user?._id}`
                : "Enter your Akahu Personal App tokens below"}
            </Text>
          </View>
        </View>

        {/* Biometric Security Toggle Card */}
        <View style={styles.card}>
          <View style={styles.biometricRow}>
            <View style={styles.biometricIconBox}>
              <Ionicons name="finger-print" size={22} color="#3b82f6" />
            </View>
            <View style={styles.biometricTextCol}>
              <Text style={styles.biometricTitle}>Biometric Security</Text>
              <Text style={styles.biometricSubtitle}>
                {biometricEnabled
                  ? "Tokens are locked behind biometrics. Turning this off wipes all saved tokens."
                  : "Automatically enabled when you verify & save your tokens."}
              </Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={handleBiometricToggleAttempt}
              trackColor={{ false: "#cbd5e1", true: "#3b82f6" }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* Akahu Token Form */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Akahu Credentials</Text>
              <Text style={styles.cardDescription}>
                {isFormLocked
                  ? "Your Akahu tokens are encrypted and locked. Tap Edit to unlock with biometrics."
                  : "Get your Personal App tokens from my.akahu.nz/developers and save them."}
              </Text>
            </View>
            {isFormLocked && (
              <TouchableOpacity style={styles.editButton} onPress={handleUnlockToEdit}>
                <Ionicons name="lock-open-outline" size={16} color="#3b82f6" />
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          {!isFormLocked && (
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
          )}

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>App ID Token (X-Akahu-Id)</Text>
              {isFormLocked && <Ionicons name="lock-closed" size={14} color="#64748b" />}
            </View>
            <TextInput
              style={[styles.input, isFormLocked && styles.inputLocked]}
              placeholder="app_token_..."
              placeholderTextColor="#94a3b8"
              value={isFormLocked ? maskToken(activeAppToken, 14) : activeAppToken}
              onChangeText={setDraftAppToken}
              editable={!isFormLocked}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>User Access Token (Bearer)</Text>
              {isFormLocked && <Ionicons name="lock-closed" size={14} color="#64748b" />}
            </View>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={[styles.input, styles.passwordInput, isFormLocked && styles.inputLocked]}
                placeholder="user_token_..."
                placeholderTextColor="#94a3b8"
                value={isFormLocked ? maskToken(activeUserToken, 15) : activeUserToken}
                onChangeText={setDraftUserToken}
                editable={!isFormLocked}
                secureTextEntry={!isFormLocked && !showUserToken}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {!isFormLocked && (
                <TouchableOpacity style={styles.eyeButton} onPress={toggleShowUserToken}>
                  <Ionicons name={showUserToken ? "eye-off-outline" : "eye-outline"} size={20} color="#64748b" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {activeError && (
            <View style={[styles.messageBanner, styles.errorBanner]}>
              <Ionicons name="alert-circle" size={18} color="#dc2626" />
              <Text style={[styles.messageText, styles.errorText]}>{activeError}</Text>
            </View>
          )}

          {!activeError && activeSuccess && (
            <View style={[styles.messageBanner, styles.successBanner]}>
              <Ionicons name="checkmark-circle" size={18} color="#059669" />
              <Text style={[styles.messageText, styles.successText]}>{activeSuccess}</Text>
            </View>
          )}

          {!isFormLocked ? (
            <TouchableOpacity
              style={[styles.saveButton, saveMutation.isPending && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons name="finger-print" size={20} color="#ffffff" />
              )}
              <Text style={styles.saveButtonText}>
                {saveMutation.isPending ? "Verifying..." : "Verify & Lock with Biometrics"}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.lockedBannerButton} onPress={handleUnlockToEdit}>
              <Ionicons name="lock-closed-outline" size={18} color="#3b82f6" />
              <Text style={styles.lockedBannerText}>Credentials Locked — Tap to Unlock with Biometrics</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Warning Modal for Turning Off Biometric Security */}
      <Modal visible={showWipeModal} transparent animationType="fade" onRequestClose={() => setShowWipeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalWarningIcon}>
              <Ionicons name="warning-outline" size={32} color="#dc2626" />
            </View>
            <Text style={styles.modalTitle}>Turn Off Biometric Security?</Text>
            <Text style={styles.modalBody}>
              If you toggle Biometric Security off, your saved Akahu App ID Token and User Access Token will be
              permanently wiped from device storage.{"\n\n"}You will have to copy and paste both tokens from Akahu all
              over again.
            </Text>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowWipeModal(false)}>
                <Text style={styles.modalCancelText}>Keep On</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={() => {
                  clearMutationStates()
                  wipeMutation.mutate()
                }}
                disabled={wipeMutation.isPending}
              >
                <Ionicons name="finger-print" size={18} color="#ffffff" />
                <Text style={styles.modalConfirmText}>
                  {wipeMutation.isPending ? "Wiping..." : "Verify & Wipe Tokens"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    marginBottom: 16,
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
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  biometricRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  biometricIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  biometricTextCol: {
    flex: 1,
    paddingRight: 8,
  },
  biometricTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 2,
  },
  biometricSubtitle: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 18,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
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
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 10,
  },
  editButtonText: {
    color: "#3b82f6",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 4,
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
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
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
  inputLocked: {
    backgroundColor: "#f1f5f9",
    borderColor: "#e2e8f0",
    color: "#64748b",
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
  lockedBannerButton: {
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  lockedBannerText: {
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  modalWarningIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fef2f2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 10,
    textAlign: "center",
  },
  modalBody: {
    fontSize: 14,
    color: "#475569",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 24,
  },
  modalButtonsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "600",
  },
  modalConfirmButton: {
    flex: 1.4,
    backgroundColor: "#dc2626",
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  modalConfirmText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
})
