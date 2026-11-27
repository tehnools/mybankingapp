const VARIANT = process.env.APP_VARIANT
const isProd = VARIANT === "production"
const BASE_IDENTIFIER = "nz.mybanking.app"

const getUniqueIdentifier = () => (isProd ? BASE_IDENTIFIER : `${BASE_IDENTIFIER}.${VARIANT ?? "local"}`)
const getAppName = () => (isProd ? `myBankingApp` : `myBankingApp ${VARIANT ?? "local"}`)
const getScheme = () => (isProd ? `nz-my-banking-app` : `nz-my-banking-app-${VARIANT ?? "local"}`)

export default ({ config }) => {
  return {
    ...config,
    name: getAppName(),
    slug: "nz-my-banking-app",
    version: "0.0.1",
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    splash: {
      resizeMode: "contain",
      backgroundColor: "#1a365d",
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: getUniqueIdentifier(),
      infoPlist: {
        NSFaceIDUsageDescription: "Allow myBankingApp to use Face ID to protect your financial data.",
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#1a365d",
      },
      package: getUniqueIdentifier(),
      permissions: ["USE_BIOMETRIC", "USE_FINGERPRINT"],
    },
    web: {
      bundler: "metro",
    },
    scheme: getScheme(),
    extra: {
      eas: {
        projectId: "f140ef26-d559-408e-8921-45df2121b97d",
      },
    },
    plugins: [
      "expo-router",
      "expo-secure-store",
      "expo-sqlite",
      [
        "expo-local-authentication",
        {
          faceIDPermission: "Allow myBankingApp to use Face ID to protect your financial data.",
        },
      ],
    ],
  }
}
