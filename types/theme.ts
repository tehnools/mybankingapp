import type { Theme as ExpoRouterTheme } from "expo-router"

export interface AppThemeColors {
  primary: string
  primarySoft: string
  background: string
  card: string
  text: string
  subtext: string
  muted: string
  border: string
  notification: string
  headerBackground: string
  headerText: string
  positive: string
  positiveSoft: string
  negative: string
  negativeSoft: string
}

export interface AppTheme extends Omit<ExpoRouterTheme, "colors"> {
  dark: boolean
  colors: AppThemeColors
}
