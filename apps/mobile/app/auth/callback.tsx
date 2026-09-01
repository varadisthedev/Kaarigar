/**
 * OAuth deep link callback handler.
 *
 * The Google OAuth flow redirects back to kaarigar://auth/callback
 * with ?accessToken=...&refreshToken=...&user=...
 *
 * expo-web-browser.openAuthSessionAsync captures this and resolves the
 * promise in auth-context.tsx — this file just needs to exist so that
 * Expo Router correctly registers the route under the "auth" segment
 * and the session resolver in WebBrowser can match it.
 *
 * In practice this screen is never visually rendered; the WebBrowser
 * session intercepts the redirect before the OS can open it as a new
 * activity. It is kept as a visible fallback in case the interception
 * fails (e.g., a cold-start deep link from outside the app).
 */
import { useEffect } from "react"
import { View, ActivityIndicator, StyleSheet } from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { setTokens } from "@/lib/auth-storage"

export default function OAuthCallbackScreen() {
  const params = useLocalSearchParams<{
    accessToken?: string
    refreshToken?: string
    error?: string
  }>()

  useEffect(() => {
    async function handle() {
      if (params.error) {
        // Redirect back to login with error
        router.replace("/(auth)/login")
        return
      }
      if (params.accessToken && params.refreshToken) {
        await setTokens({
          accessToken: params.accessToken,
          refreshToken: params.refreshToken,
        })
        router.replace("/(tabs)")
      } else {
        router.replace("/(auth)/login")
      }
    }
    handle()
  }, [params])

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#7c3aed" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
})
