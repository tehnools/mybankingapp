import { getColors, type ImageColorsResult } from "react-native-image-colors"
import { downloadLogoFile, getLogoUriFromFileName } from "./logo-files"
import { getCachedConnectionsFromDb, getConnectionsNeedingBranding, updateConnectionBranding } from "./db"

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/

/** Logos that sample as near-white make the card unreadable against the light canvas, so they are ignored. */
const MAX_BRAND_LUMINANCE = 0.85

/** Known NZ bank brand colors used as fallback when a logo is an SVG or native palette sampling is unavailable. */
const KNOWN_NZ_BANK_COLORS: Record<string, string> = {
  anz: "#007DBA",
  asb: "#D99B00",
  bnz: "#0033A0",
  westpac: "#DA1710",
  kiwibank: "#008751",
  tsb: "#005596",
  "co-operative": "#008066",
  cooperative: "#008066",
  rabobank: "#002277",
  sbs: "#E31837",
  heartland: "#6D2077",
  sharesies: "#E11D48",
  simplicity: "#0F766E",
  kernel: "#1E293B",
  booster: "#0284C7",
}

export const getFallbackBankColor = (bankName?: string): string | null => {
  if (!bankName) return null
  const lower = bankName.toLowerCase()
  for (const [key, hex] of Object.entries(KNOWN_NZ_BANK_COLORS)) {
    if (lower.includes(key)) {
      return hex
    }
  }
  return null
}

export const getRelativeLuminance = (hex: string): number => {
  const channels = [1, 3, 5].map((start: number): number => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255
    return value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

/** Picks dark or white text depending on which contrasts better with the brand color background. */
export const getReadableTextColor = (backgroundHex: string): string => {
  if (!HEX_COLOR_PATTERN.test(backgroundHex)) {
    return "#FFFFFF"
  }
  return getRelativeLuminance(backgroundHex) > 0.42 ? "#1C1917" : "#FFFFFF"
}

const pickBrandColor = (result: ImageColorsResult): string | null => {
  const candidates: Array<string | undefined> =
    result.platform === "ios"
      ? [result.primary, result.background, result.secondary]
      : [result.dominant, result.darkVibrant, result.vibrant]

  for (const candidate of candidates) {
    if (
      candidate &&
      HEX_COLOR_PATTERN.test(candidate) &&
      candidate.toUpperCase() !== "#000000" &&
      getRelativeLuminance(candidate) <= MAX_BRAND_LUMINANCE
    ) {
      return candidate.toUpperCase()
    }
  }
  return null
}

/**
 * Eyedrops the main brand color from a locally cached logo file or URL.
 * @returns a `#RRGGBB` hex string, or null if no usable color could be sampled.
 */
export const extractBrandColor = async (logoUri: string, bankName?: string): Promise<string | null> => {
  try {
    const result = await getColors(logoUri, { fallback: "#000000", cache: false })
    const sampled = pickBrandColor(result)
    if (sampled && sampled !== "#000000") {
      return sampled
    }
  } catch (error) {
    console.warn("Native image color extraction fallback:", error)
  }
  return getFallbackBankColor(bankName)
}

/**
 * Downloads any missing bank logos and eyedrops their brand colors into SQLite.
 * Connections that already have both a cached logo and a color are skipped, so this is cheap to
 * call after every account sync.
 */
export const syncConnectionBranding = async (): Promise<void> => {
  const pending = await getConnectionsNeedingBranding()
  if (pending.length === 0) return

  const allConnections = await getCachedConnectionsFromDb()
  const nameById = new Map<string, string>(allConnections.map((c) => [c.id, c.name]))

  await Promise.all(
    pending.map(async (connection): Promise<void> => {
      const bankName = nameById.get(connection.id)
      const hasCachedLogo = Boolean(getLogoUriFromFileName(connection.logoFile))
      const logoFile = hasCachedLogo ? connection.logoFile : await downloadLogoFile(connection.id, connection.logoUrl)
      const logoUri = getLogoUriFromFileName(logoFile) || connection.logoUrl
      const primaryColor = logoUri ? await extractBrandColor(logoUri, bankName) : getFallbackBankColor(bankName)

      await updateConnectionBranding(connection.id, { logoFile, primaryColor })
    }),
  )
}
