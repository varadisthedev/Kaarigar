import Constants from "expo-constants"

/** Set EXPO_PUBLIC_API_URL in .env (e.g. http://192.168.1.x:3000 for a
 * local Next.js dev server reachable from a physical device/simulator). */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000"

export const APP_VERSION = Constants.expoConfig?.version ?? "1.0.0"
