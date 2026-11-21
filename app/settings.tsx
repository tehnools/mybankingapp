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
import { useAppTheme } from "../lib/theme"
import { getPinFlowCopy } from "../types"

const maskToken = (token: string, prefixLen = 12): string => {
  if (!token) return ""
  if (token.length <= prefixLen + 4) return token
  return `${token.slice(0, prefixLen)}••••••••••••${token.slice(-2)}`
}

const SettingsScreen = (): React.JSX.Element => {
  const { colors } = useAppTheme()
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

  const {
    isOpen: isPinModalOpen,
    title: pinModalTitle,
    subtitle: pinModalSubtitle,
  } = getPinFlowCopy(pinFlowMode === "confirm-pin" ? { mode: "confirm-pin", firstPinEntry } : { mode: pinFlowMode })

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Connection Status Card */}
        <View
          style={[
            styles.statusCard,
            isConnected
              ? { backgroundColor: colors.positiveSoft, borderColor: colors.positive }
              : { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Ionicons
            name={isConnected ? "shield-checkmark" : "information-circle"}
            size={24}
            color={isConnected ? colors.positive : colors.subtext}
          />
          <View style={styles.statusTextWrapper}>
            <Text style={[styles.statusTitle, { color: colors.text }]}>
              {isCheckingConnection
                ? "Checking connection..."
                : isConnected
                  ? hasPin
                    ? "Akahu Connected & Protected"
                    : "Akahu Connected (Set PIN to Lock)"
                  : "Not Connected"}
            </Text>
            <Text style={[styles.statusSubtitle, { color: colors.subtext }]}>
              {isConnected
                ? connectionStatus?.user?.email || `User ID: ${connectionStatus?.user?._id}`
                : "Enter your Akahu Personal App tokens below"}
            </Text>
          </View>
        </View>

        {/* Security & Biometrics Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.securityHeaderRow}>
            <View style={[styles.biometricIconBox, { backgroundColor: colors.positiveSoft }]}>
              <Ionicons name="keypad-outline" size={20} color={colors.positive} />
            </View>
            <View style={styles.biometricTextCol}>
              <Text style={[styles.biometricTitle, { color: colors.text }]}>6-Digit App PIN (Mandatory)</Text>
              <Text style={[styles.biometricSubtitle, { color: colors.subtext }]}>
                {hasPin
                  ? "Active — always available as your backup unlock if biometrics fail or are removed."
                  : "You will create a 6-digit PIN when you verify & save your tokens."}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.biometricRow}>
            <View style={[styles.biometricIconBox, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="finger-print" size={22} color={colors.primary} />
            </View>
            <View style={styles.biometricTextCol}>
              <Text style={[styles.biometricTitle, { color: colors.text }]}>Biometric Unlock</Text>
              <Text style={[styles.biometricSubtitle, { color: colors.subtext }]}>
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
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {/* Akahu Token Form */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Akahu Credentials</Text>
              <Text style={[styles.cardDescription, { color: colors.subtext }]}>
                {isFormLocked
                  ? "Your Akahu tokens are encrypted and locked. Tap Edit to unlock with biometrics or PIN."
                  : "Get your Personal App tokens from my.akahu.nz/developers and save them."}
              </Text>
            </View>
            {isFormLocked && (
              <TouchableOpacity
                style={[styles.editButton, { backgroundColor: colors.primarySoft }]}
                onPress={handleUnlockToEdit}
              >
                <Ionicons name="lock-open-outline" size={16} color={colors.primary} />
                <Text style={[styles.editButtonText, { color: colors.primary }]}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          {!isFormLocked && (
            <View style={styles.helperLinksRow}>
              <TouchableOpacity
                style={[styles.linkButton, { backgroundColor: colors.primarySoft }]}
                onPress={() => AkahuAuth.openAkahuAccountSetup()}
              >
                <Ionicons name="open-outline" size={16} color={colors.primary} />
                <Text style={[styles.linkButtonText, { color: colors.primary }]}>1. Link Banks</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.linkButton, { backgroundColor: colors.primarySoft }]}
                onPress={() => AkahuAuth.openAkahuDeveloperTokens()}
              >
                <Ionicons name="key-outline" size={16} color={colors.primary} />
                <Text style={[styles.linkButtonText, { color: colors.primary }]}>2. Get Tokens</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.linkButton, { backgroundColor: colors.primarySoft }]}
                onPress={() => pasteMutation.mutate()}
              >
                <Ionicons name="clipboard-outline" size={16} color={colors.primary} />
                <Text style={[styles.linkButtonText, { color: colors.primary }]}>Paste</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.text }]}>App ID Token (X-Akahu-Id)</Text>
              {isFormLocked && <Ionicons name="lock-closed" size={14} color={colors.subtext} />}
            </View>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: isFormLocked ? colors.subtext : colors.text,
                },
              ]}
              placeholder="app_token_..."
              placeholderTextColor={colors.muted}
              value={isFormLocked ? maskToken(activeAppToken, 14) : activeAppToken}
              onChangeText={setDraftAppToken}
              editable={!isFormLocked}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.text }]}>User Access Token (Bearer)</Text>
              {isFormLocked && <Ionicons name="lock-closed" size={14} color={colors.subtext} />}
            </View>
            <View style={styles.passwordWrapper}>
              <TextInput
                style={[
                  styles.input,
                  styles.passwordInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: isFormLocked ? colors.subtext : colors.text,
                  },
                ]}
                placeholder="user_token_..."
                placeholderTextColor={colors.muted}
                value={isFormLocked ? maskToken(activeUserToken, 15) : activeUserToken}
                onChangeText={setDraftUserToken}
                editable={!isFormLocked}
                secureTextEntry={!isFormLocked && !showUserToken}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {!isFormLocked && (
                <TouchableOpacity style={styles.eyeButton} onPress={toggleShowUserToken}>
                  <Ionicons name={showUserToken ? "eye-off-outline" : "eye-outline"} size={20} color={colors.subtext} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {activeError && (
            <View
              style={[styles.messageBanner, { backgroundColor: colors.negativeSoft, borderColor: colors.negative }]}
            >
              <Ionicons name="alert-circle" size={18} color={colors.negative} />
              <Text style={[styles.messageText, { color: colors.negative }]}>{activeError}</Text>
            </View>
          )}

          {!activeError && activeSuccess && (
            <View
              style={[styles.messageBanner, { backgroundColor: colors.positiveSoft, borderColor: colors.positive }]}
            >
              <Ionicons name="checkmark-circle" size={18} color={colors.positive} />
              <Text style={[styles.messageText, { color: colors.positive }]}>{activeSuccess}</Text>
            </View>
          )}

          {!isFormLocked ? (
            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: colors.primary },
                saveMutation.isPending && styles.buttonDisabled,
              ]}
              onPress={handleSave}
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons name="shield-checkmark-outline" size={20} color="#ffffff" />
              )}
              <Text style={styles.saveButtonText}>
                {saveMutation.isPending ? "Verifying..." : hasPin ? "Verify & Save Tokens" : "Verify & Set 6-Digit PIN"}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.lockedBannerButton, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}
              onPress={handleUnlockToEdit}
            >
              <Ionicons name="lock-closed-outline" size={18} color={colors.primary} />
              <Text style={[styles.lockedBannerText, { color: colors.primary }]}>
                Credentials Locked — Tap to Unlock
              </Text>
            </TouchableOpacity>
          )}

          {hasStoredTokens && (
            <TouchableOpacity style={styles.wipeLinkButton} onPress={() => setShowWipeModal(true)}>
              <Ionicons name="trash-outline" size={16} color={colors.negative} />
              <Text style={[styles.wipeLinkText, { color: colors.negative }]}>Clear Saved Tokens & Reset PIN</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Mandatory 6-Digit PIN Setup / Verification Modal */}
      <Modal visible={isPinModalOpen} transparent animationType="fade" onRequestClose={closePinFlow}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
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
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={[styles.modalWarningIcon, { backgroundColor: colors.negativeSoft }]}>
              <Ionicons name="warning-outline" size={32} color={colors.negative} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Wipe All Saved Tokens & PIN?</Text>
            <Text style={[styles.modalBody, { color: colors.subtext }]}>
              This will permanently remove your Akahu App ID Token, User Access Token, and 6-digit PIN from device
              storage.{"\n\n"}You will have to copy and paste both tokens from Akahu all over again.
            </Text>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalCancelButton, { backgroundColor: colors.background }]}
                onPress={() => setShowWipeModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmButton, { backgroundColor: colors.negative }]}
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
  statusTextWrapper: {
    marginLeft: 12,
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  statusSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
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
    marginBottom: 2,
  },
  biometricSubtitle: {
    fontSize: 13,
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
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 10,
  },
  editButtonText: {
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
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  linkButtonText: {
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
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
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
  messageText: {
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
  saveButton: {
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
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    borderWidth: 1,
  },
  lockedBannerText: {
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
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: "700",
    marginBottom: 10,
    textAlign: "center",
  },
  modalBody: {
    fontSize: 14,
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
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: "600",
  },
  modalConfirmButton: {
    flex: 1.4,
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
