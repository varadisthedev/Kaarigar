import * as SecureStore from "expo-secure-store"
import { Platform } from "react-native"

const ACCESS_KEY = "kaarigar_access_token"
const REFRESH_KEY = "kaarigar_refresh_token"

export type StoredTokens = { accessToken: string; refreshToken: string }

export async function getTokens(): Promise<StoredTokens | null> {
  if (Platform.OS === "web") {
    const accessToken = localStorage.getItem(ACCESS_KEY)
    const refreshToken = localStorage.getItem(REFRESH_KEY)
    if (!accessToken || !refreshToken) return null
    return { accessToken, refreshToken }
  }

  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_KEY),
    SecureStore.getItemAsync(REFRESH_KEY),
  ])
  if (!accessToken || !refreshToken) return null
  return { accessToken, refreshToken }
}

export async function setTokens(tokens: StoredTokens): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(ACCESS_KEY, tokens.accessToken)
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken)
    return
  }

  await Promise.all([
    SecureStore.setItemAsync(ACCESS_KEY, tokens.accessToken),
    SecureStore.setItemAsync(REFRESH_KEY, tokens.refreshToken),
  ])
}

export async function clearTokens(): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
    return
  }

  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY)
  ])
}
