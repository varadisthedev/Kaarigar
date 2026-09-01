import { Tabs, Redirect } from "expo-router"
import { Text } from "react-native"

import { useAuth } from "@/lib/auth-context"

function TabIcon({ label }: { label: string }) {
  return <Text style={{ fontSize: 18 }}>{label}</Text>
}

export default function TabsLayout() {
  const { user, loading } = useAuth()

  if (!loading && !user) return <Redirect href="/(auth)/login" />

  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: "#7c3aed" }}>
      <Tabs.Screen name="index" options={{ title: "Marketplace", tabBarIcon: () => <TabIcon label="🏪" /> }} />
      <Tabs.Screen name="catalog/index" options={{ title: "Catalog", tabBarIcon: () => <TabIcon label="🧺" /> }} />
      <Tabs.Screen name="add-product" options={{ title: "Add Product", tabBarIcon: () => <TabIcon label="➕" /> }} />
      <Tabs.Screen name="pricing" options={{ title: "NLP Pricing", tabBarIcon: () => <TabIcon label="💡" /> }} />
      <Tabs.Screen name="chat/index" options={{ title: "Chat", tabBarIcon: () => <TabIcon label="💬" /> }} />
      <Tabs.Screen name="catalog/[slug]" options={{ href: null }} />
      <Tabs.Screen name="chat/[id]" options={{ href: null }} />
    </Tabs>
  )
}
