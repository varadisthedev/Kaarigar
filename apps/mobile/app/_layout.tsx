import "react-native-url-polyfill/auto"
import { QueryClientProvider } from "@tanstack/react-query"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { Stack } from "expo-router"

import { AuthProvider } from "@/lib/auth-context"
import { queryClient } from "@/lib/query-client"

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}
