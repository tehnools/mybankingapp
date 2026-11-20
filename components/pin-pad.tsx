import React from "react"
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { Text } from "./app-text"

export interface PinPadProps {
  title: string
  subtitle: string
  value: string
  onChange: (nextPin: string) => void
  onComplete: (pin: string) => void
  errorMessage?: string | null
  isLoading?: boolean
  showBiometricButton?: boolean
  onBiometricPress?: () => void
  onCancel?: () => void
}

const KEYPAD_ROWS: Array<Array<string>> = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["bio", "0", "back"],
]

export const PinPad = ({
  title,
  subtitle,
  value,
  onChange,
  onComplete,
  errorMessage,
  isLoading = false,
  showBiometricButton = false,
  onBiometricPress,
  onCancel,
}: PinPadProps): React.JSX.Element => {
  const handleKeyPress = (key: string): void => {
    if (isLoading) return

    if (key === "back") {
      if (value.length > 0) {
        onChange(value.slice(0, -1))
      }
      return
    }

    if (key === "bio") {
      onBiometricPress?.()
      return
    }

    if (value.length >= 6) return
    const nextValue = `${value}${key}`
    onChange(nextValue)
    if (nextValue.length === 6) {
      onComplete(nextValue)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons name="keypad-outline" size={28} color="#3b82f6" />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      {/* 6 PIN Dots */}
      <View style={styles.dotsRow}>
        {[0, 1, 2, 3, 4, 5].map((index: number): React.JSX.Element => {
          const filled = index < value.length
          return <View key={index} style={[styles.dot, filled && styles.dotFilled]} />
        })}
      </View>

      {isLoading ? (
        <View style={styles.statusSlot}>
          <ActivityIndicator size="small" color="#3b82f6" />
        </View>
      ) : errorMessage ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={16} color="#dc2626" />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : (
        <View style={styles.statusSlot} />
      )}

      {/* Numeric Keypad */}
      <View style={styles.keypad}>
        {KEYPAD_ROWS.map((row: string[], rowIndex: number): React.JSX.Element => (
          <View key={rowIndex} style={styles.keypadRow}>
            {row.map((key: string): React.JSX.Element => {
              if (key === "bio") {
                if (!showBiometricButton) {
                  return <View key={key} style={styles.keySpacer} />
                }
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.keyButton, styles.actionKeyButton]}
                    onPress={() => handleKeyPress(key)}
                    disabled={isLoading}
                  >
                    <Ionicons name="finger-print" size={26} color="#3b82f6" />
                  </TouchableOpacity>
                )
              }

              if (key === "back") {
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.keyButton, styles.actionKeyButton]}
                    onPress={() => handleKeyPress(key)}
                    disabled={isLoading || value.length === 0}
                  >
                    <Ionicons
                      name="backspace-outline"
                      size={24}
                      color={value.length === 0 ? "#cbd5e1" : "#334155"}
                    />
                  </TouchableOpacity>
                )
              }

              return (
                <TouchableOpacity
                  key={key}
                  style={styles.keyButton}
                  onPress={() => handleKeyPress(key)}
                  disabled={isLoading}
                >
                  <Text style={styles.keyText} preventOrphans={false}>
                    {key}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        ))}
      </View>

      {onCancel && (
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel} disabled={isLoading}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

export default PinPad

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 6,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 14,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    backgroundColor: "transparent",
  },
  dotFilled: {
    borderColor: "#3b82f6",
    backgroundColor: "#3b82f6",
  },
  statusSlot: {
    minHeight: 34,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    width: "100%",
  },
  errorText: {
    color: "#dc2626",
    fontSize: 13,
    marginLeft: 6,
    flex: 1,
  },
  keypad: {
    width: "100%",
    maxWidth: 280,
    gap: 12,
  },
  keypadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  keyButton: {
    flex: 1,
    aspectRatio: 1.25,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
  },
  actionKeyButton: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  keySpacer: {
    flex: 1,
  },
  keyText: {
    fontSize: 22,
    fontWeight: "600",
    color: "#1e293b",
  },
  cancelButton: {
    marginTop: 18,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  cancelText: {
    color: "#64748b",
    fontSize: 15,
    fontWeight: "600",
  },
})
