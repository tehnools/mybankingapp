"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useAuthStore } from "../store/use-auth-store"
import { SecurityManager } from "../lib/security"

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading, authenticate, checkSession } = useAuthStore()
  const [securityInfo, setSecurityInfo] = useState<any>(null)

  useEffect(() => {
    const initializeAuth = async () => {
      const info = await SecurityManager.initializeSecurity()
      setSecurityInfo(info)

      // Check if there's a valid session
      await checkSession()
    }

    initializeAuth()
  }, [checkSession])

  const handleAuthenticate = async () => {
    const success = await authenticate()
    if (!success) {
      // Handle authentication failure
      console.log("Authentication failed")
    }
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Authenticating...</Text>
      </View>
    )
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.authContainer}>
        <View style={styles.authContent}>
          <View style={styles.iconContainer}>
            <Ionicons name="shield-checkmark" size={64} color="#3b82f6" />
          </View>
          <Text style={styles.title}>Secure Access</Text>
          <Text style={styles.subtitle}>Your financial data is protected with bank-level security</Text>

          <View style={styles.securityFeatures}>
            <View style={styles.featureItem}>
              <Ionicons name="lock-closed" size={20} color="#059669" />
              <Text style={styles.featureText}>End-to-end encryption</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="finger-print" size={20} color="#059669" />
              <Text style={styles.featureText}>
                {securityInfo?.isEnrolled ? "Biometric authentication" : "Device security"}
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="time" size={20} color="#059669" />
              <Text style={styles.featureText}>Auto-lock after inactivity</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.authButton} onPress={handleAuthenticate}>
            <Ionicons name="unlock" size={20} color="#ffffff" />
            <Text style={styles.authButtonText}>
              {securityInfo?.isEnrolled ? "Authenticate with Biometrics" : "Continue"}
            </Text>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            Your data is stored securely on your device and never shared without your permission
          </Text>
        </View>
      </View>
    )
  }

  return <>{children}</>
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#64748b",
  },
  authContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  authContent: {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  securityFeatures: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 20,
    marginBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  featureText: {
    fontSize: 14,
    color: "#1e293b",
    marginLeft: 12,
    fontWeight: "500",
  },
  authButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    marginBottom: 20,
  },
  authButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  disclaimer: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 18,
  },
})
