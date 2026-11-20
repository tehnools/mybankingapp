import React from "react"
import {
  View,
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
import { Text } from "../components/app-text"
import { PinPad } from "../components/pin-pad"
import { AkahuAuth } from "../lib/akahu-auth"
import {
  useAkahuConnection,
  useAkahuStoredSettings,
  useAutoPasteAkahuClipboard,
  useCompletePinAndBiometricUplift,
  usePasteAkahuClipboard,
  useSaveAkahuTokens,
  useToggleBiometrics,
  useUnlockCredentialsForm,
  useVerifyPinForEdit,
  useVerifyPinToDisableBiometrics,
  useWipeAkahuTokens,
} from "../hooks/use-akahu-data"
import { useSettingsFormStore } from "../lib/store"

const maskToken = (token: string, prefixLen = 12): string => {
  if (!token) return ""
  if (token.length <= prefixLen + 4) return token
  return `${token.slice(0, prefixLen)}••••••••••••${token.slice(-2)}`
}

const SettingsScreen = (): React.JSX.Element => {
  const { data: connectionStatus, isLoading: isCheckingConnection } = useAkahuConnection()
  const { data: storedSettings } = useAkahuStoredSettings()

  const saveMutation = useSaveAkahuTokens()
  const completePinMutation = useCompletePinAndBiometricUplift()
  const unlockMutation = useUnlockCredentialsForm()
  const verifyPinEditMutation = useVerifyPinForEdit()
  const toggleBioMutation = useToggleBiometrics()
  const verifyPinDisableBioMutation = useVerifyPinToDisableBiometrics()
  const wipeMutation = useWipeAkahuTokens()
  const pasteMutation = usePasteAkahuClipboard()

  const {
    draftAppToken,
    draftUserToken,
    showUserToken,
    isUnlockedForEditing,
    showWipeModal,
    pinFlowMode,
    pinInput,
    firstPinEntry,
    pinError,
    setDraftAppToken,
    setDraftUserToken,
    toggleShowUserToken,
    setShowWipeModal,
    closePinFlow,
    setPinInput,
    advanceToConfirmPin,
    setPinError,
  } = useSettingsFormStore()

  // Derived state directly from TanStack Query + Zustand
  const hasStoredTokens = Boolean(storedSettings?.hasStoredTokens)
  const hasPin = Boolean(storedSettings?.hasPin)
  const isFormLocked = hasStoredTokens && hasPin && !isUnlockedForEditing
  const biometricEnabled = Boolean(storedSettings?.biometricEnabled)
  const isConnected = Boolean(connectionStatus?.connected)

  // Automatically check clipboard on focus when form is unlocked and auto-paste app_token_ / user_token_
  const autoPasteQuery = useAutoPasteAkahuClipboard(!isFormLocked)

  const activeAppToken = isFormLocked ? storedSettings?.appToken || "" : draftAppToken
  const activeUserToken = isFormLocked ? storedSettings?.accessToken || "" : draftUserToken

  const activeError =
    (saveMutation.error instanceof Error && saveMutation.error.message) ||
    (completePinMutation.error instanceof Error && completePinMutation.error.message) ||
    (unlockMutation.error instanceof Error && unlockMutation.error.message) ||
    (toggleBioMutation.error instanceof Error && toggleBioMutation.error.message) ||
    (wipeMutation.error instanceof Error && wipeMutation.error.message) ||
    (storedSettings?.biometricsDisabledByOs
      ? "Biometrics were removed from your phone settings. Biometric unlock was disabled, and your 6-digit PIN remains active."
      : null)

  const lastAutoPastedApp = pasteMutation.data?.pastedAppToken || autoPasteQuery.data?.pastedAppToken || null
  const lastAutoPastedUser = pasteMutation.data?.pastedUserToken || autoPasteQuery.data?.pastedUserToken || null

  const activeSuccess = completePinMutation.isSuccess
    ? completePinMutation.data.biometricsEnabled
      ? "6-digit PIN set & Biometric Unlock enabled!"
      : "6-digit PIN set! Your Akahu tokens are now locked."
    : saveMutation.isSuccess && !saveMutation.data.needsPinSetup
      ? `Tokens verified & saved${saveMutation.data.user?.email ? ` (${saveMutation.data.user.email})` : ""}!`
      : (unlockMutation.isSuccess || verifyPinEditMutation.isSuccess) && isUnlockedForEditing
        ? "Form unlocked for editing."
        : wipeMutation.isSuccess && !hasStoredTokens
          ? "All Akahu tokens and PIN have been wiped from storage."
          : !isFormLocked && (lastAutoPastedApp || lastAutoPastedUser)
            ? `Auto-pasted ${
                lastAutoPastedApp && lastAutoPastedUser
                  ? "App ID Token & User Access Token"
                  : lastAutoPastedApp
                    ? "App ID Token"
                    : "User Access Token"
              } from clipboard!`
            : null

  const clearMutationStates = (): void => {
    saveMutation.reset()
    completePinMutation.reset()
    unlockMutation.reset()
    verifyPinEditMutation.reset()
    toggleBioMutation.reset()
    verifyPinDisableBioMutation.reset()
    wipeMutation.reset()
  }

  const handleSave = (): void => {
    clearMutationStates()
    saveMutation.mutate({ appToken: activeAppToken, userToken: activeUserToken })
  }

  const handleUnlockToEdit = (): void => {
    clearMutationStates()
    unlockMutation.mutate({ biometricEnabled })
  }

  const handleBiometricToggle = (nextValue: boolean): void => {
    clearMutationStates()
    if (!hasPin || !hasStoredTokens) {
      return
    }
    toggleBioMutation.mutate(nextValue)
  }

  const handlePinComplete = (completedPin: string): void => {
    if (pinFlowMode === "setup-pin") {
      advanceToConfirmPin(completedPin)
      return
    }

    if (pinFlowMode === "confirm-pin") {
      if (completedPin !== firstPinEntry) {
        setPinError("PINs do not match. Please try again.")
        return
      }
      completePinMutation.mutate(completedPin)
      return
    }

    if (pinFlowMode === "verify-edit") {
      verifyPinEditMutation.mutate(completedPin)
      return
    }

    if (pinFlowMode === "verify-disable-bio") {
      verifyPinDisableBioMutation.mutate(completedPin)
    }
  }

  const pinModalTitle =
    pinFlowMode === "setup-pin"
      ? "Create a 6-Digit PIN"
      : pinFlowMode === "confirm-pin"
        ? "Confirm Your 6-Digit PIN"
        : pinFlowMode === "verify-disable-bio"
          ? "Enter 6-Digit PIN"
          : "Unlock Credentials"

  const pinModalSubtitle =
    pinFlowMode === "setup-pin"
      ? "Your 6-digit PIN is mandatory and protects your tokens if biometrics are unavailable or removed."
      : pinFlowMode === "confirm-pin"
        ? "Re-enter your 6-digit PIN. Biometric uplift will follow right after."
        : pinFlowMode === "verify-disable-bio"
          ? "Confirm your 6-digit PIN to turn off Biometric Unlock. Your tokens will stay safe."
          : "Enter your 6-digit PIN to unlock and edit your Akahu tokens."

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
                  ? hasPin
                    ? "Akahu Connected & Protected"
                    : "Akahu Connected (Set PIN to Lock)"
                  : "Not Connected"}
            </Text>
            <Text style={styles.statusSubtitle}>
              {isConnected
                ? connectionStatus?.user?.email || `User ID: ${connectionStatus?.user?._id}`
                : "Enter your Akahu Personal App tokens below"}
            </Text>
          </View>
        </View>

        {/* Security & Biometrics Card */}
        <View style={styles.card}>
          <View style={styles.securityHeaderRow}>
            <View style={styles.biometricIconBox}>
              <Ionicons name="keypad-outline" size={20} color="#059669" />
            </View>
            <View style={styles.biometricTextCol}>
              <Text style={styles.biometricTitle}>6-Digit App PIN (Mandatory)</Text>
              <Text style={styles.biometricSubtitle}>
                {hasPin
                  ? "Active — always available as your backup unlock if biometrics fail or are removed."
                  : "You will create a 6-digit PIN when you verify & save your tokens."}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.biometricRow}>
            <View style={[styles.biometricIconBox, { backgroundColor: "#eff6ff" }]}>
              <Ionicons name="finger-print" size={22} color="#3b82f6" />
            </View>
            <View style={styles.biometricTextCol}>
              <Text style={styles.biometricTitle}>Biometric Unlock</Text>
              <Text style={styles.biometricSubtitle}>
                {biometricEnabled
                  ? "Enabled — prompts first on app launch, with your 6-digit PIN as backup."
                  : hasPin
                    ? "Enable fingerprint or face unlock for faster access."
                    : "Available right after you set your 6-digit PIN."}
              </Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={handleBiometricToggle}
              disabled={!hasPin || !hasStoredTokens || toggleBioMutation.isPending}
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
                  ? "Your Akahu tokens are encrypted and locked. Tap Edit to unlock with biometrics or PIN."
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

              <TouchableOpacity style={styles.linkButton} onPress={() => pasteMutation.mutate()}>
                <Ionicons name="clipboard-outline" size={16} color="#3b82f6" />
                <Text style={styles.linkButtonText}>Paste</Text>
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
                <Ionicons name="shield-checkmark-outline" size={20} color="#ffffff" />
              )}
              <Text style={styles.saveButtonText}>
                {saveMutation.isPending
                  ? "Verifying..."
                  : hasPin
                    ? "Verify & Save Tokens"
                    : "Verify & Set 6-Digit PIN"}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.lockedBannerButton} onPress={handleUnlockToEdit}>
              <Ionicons name="lock-closed-outline" size={18} color="#3b82f6" />
              <Text style={styles.lockedBannerText}>Credentials Locked — Tap to Unlock</Text>
            </TouchableOpacity>
          )}

          {hasStoredTokens && (
            <TouchableOpacity style={styles.wipeLinkButton} onPress={() => setShowWipeModal(true)}>
              <Ionicons name="trash-outline" size={16} color="#dc2626" />
              <Text style={styles.wipeLinkText}>Clear Saved Tokens & Reset PIN</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Mandatory 6-Digit PIN Setup / Verification Modal */}
      <Modal visible={pinFlowMode !== "closed"} transparent animationType="fade" onRequestClose={closePinFlow}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <PinPad
              title={pinModalTitle}
              subtitle={pinModalSubtitle}
              value={pinInput}
              onChange={setPinInput}
              onComplete={handlePinComplete}
              errorMessage={pinError}
              isLoading={
                completePinMutation.isPending ||
                verifyPinEditMutation.isPending ||
                verifyPinDisableBioMutation.isPending
              }
              onCancel={closePinFlow}
            />
          </View>
        </View>
      </Modal>

      {/* Explicit Wipe Confirmation Modal */}
      <Modal visible={showWipeModal} transparent animationType="fade" onRequestClose={() => setShowWipeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalWarningIcon}>
              <Ionicons name="warning-outline" size={32} color="#dc2626" />
            </View>
            <Text style={styles.modalTitle}>Wipe All Saved Tokens & PIN?</Text>
            <Text style={styles.modalBody}>
              This will permanently remove your Akahu App ID Token, User Access Token, and 6-digit PIN from device
              storage.{"\n\n"}You will have to copy and paste both tokens from Akahu all over again.
            </Text>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowWipeModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={(): void => {
                  clearMutationStates()
                  wipeMutation.mutate()
                }}
                disabled={wipeMutation.isPending}
              >
                <Ionicons name="trash-outline" size={18} color="#ffffff" />
                <Text style={styles.modalConfirmText}>{wipeMutation.isPending ? "Wiping..." : "Wipe Everything"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  )
}

export default SettingsScreen

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
  securityHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 14,
  },
  biometricRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  biometricIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#f0fdf4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  biometricTextCol: {
    flex: 1,
    paddingRight: 8,
  },
  biometricTitle: {
    fontSize: 15,
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
    paddingHorizontal: 10,
  },
  linkButtonText: {
    color: "#3b82f6",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 5,
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
  wipeLinkButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    marginTop: 10,
  },
  wipeLinkText: {
    color: "#dc2626",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
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
