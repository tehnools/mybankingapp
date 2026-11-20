import { Directory, File, Paths } from "expo-file-system"

const LOGO_DIR_NAME = "bank-logos"
const SUPPORTED_EXTENSIONS: ReadonlyArray<string> = ["png", "jpg", "jpeg", "webp"]

const getLogoDirectory = (): Directory => new Directory(Paths.document, LOGO_DIR_NAME)

/**
 * Only the file name is persisted in SQLite. The absolute path of the app's document directory
 * can change between app updates on iOS, so the full URI is rebuilt on every read.
 */
export const getLogoUriFromFileName = (fileName: string | null | undefined): string | undefined => {
  if (!fileName) return undefined
  const file = new File(getLogoDirectory(), fileName)
  return file.exists ? file.uri : undefined
}

/**
 * Returns the extension to store the logo under, or null when the format can't be rendered
 * by React Native's <Image> or analysed for colors (e.g. SVG).
 */
const getLogoExtension = (logoUrl: string): string | null => {
  const path = logoUrl.split("?")[0].split("#")[0]
  const extension = (path.split(".").pop() ?? "").toLowerCase()
  if (extension === "svg") return null
  return SUPPORTED_EXTENSIONS.includes(extension) ? extension : "png"
}

/**
 * Downloads a bank logo into the app's document directory.
 * @returns the stored file name, or null if the format is unsupported or the download failed.
 */
export const downloadLogoFile = async (connectionId: string, logoUrl: string): Promise<string | null> => {
  const extension = getLogoExtension(logoUrl)
  if (!extension) return null

  try {
    const directory = getLogoDirectory()
    if (!directory.exists) {
      directory.create({ idempotent: true, intermediates: true })
    }

    const fileName = `${connectionId.replace(/[^A-Za-z0-9_-]/g, "_")}.${extension}`
    const target = new File(directory, fileName)
    if (target.exists) {
      target.delete()
    }

    await File.downloadFileAsync(logoUrl, target)
    return target.exists ? fileName : null
  } catch (error) {
    console.warn(`Failed to download logo for ${connectionId}:`, error)
    return null
  }
}

export const deleteAllLogoFiles = (): void => {
  try {
    const directory = getLogoDirectory()
    if (directory.exists) {
      directory.delete()
    }
  } catch (error) {
    console.warn("Failed to delete cached bank logos:", error)
  }
}
