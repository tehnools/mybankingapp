import { DarkTheme, DefaultTheme, useTheme } from "expo-router"
import type { AppTheme } from "../types"

export const TERRACOTTA_CORAL = "#E06D53"

export const LightAppTheme: AppTheme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    primary: TERRACOTTA_CORAL,
    primarySoft: "#FDF0ED",
    background: "#FAF8F6",
    card: "#FFFFFF",
    text: "#1C1917",
    subtext: "#68615C",
    muted: "#A09892",
    border: "#ECE6E1",
    notification: TERRACOTTA_CORAL,
    headerBackground: TERRACOTTA_CORAL,
    headerText: "#FFFFFF",
    positive: "#15803D",
    positiveSoft: "#ECFDF5",
    negative: "#DC2626",
    negativeSoft: "#FEF2F2",
  },
}

export const DarkAppTheme: AppTheme = {
  ...DarkTheme,
  dark: true,
  colors: {
    primary: TERRACOTTA_CORAL,
    primarySoft: "#3D201A",
    background: "#121117",
    card: "#1E1C26",
    text: "#FAF8F6",
    subtext: "#A8A29E",
    muted: "#78716C",
    border: "#2E2B3B",
    notification: TERRACOTTA_CORAL,
    headerBackground: "#121117",
    headerText: "#FAF8F6",
    positive: "#34D399",
    positiveSoft: "#064E3B",
    negative: "#F87171",
    negativeSoft: "#7F1D1D",
  },
}

export const useAppTheme = (): AppTheme => {
  return useTheme() as AppTheme
}
