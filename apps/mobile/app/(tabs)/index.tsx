import { View, Text, Pressable, StyleSheet } from "react-native"
import { router } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"

import { useAuth } from "@/lib/auth-context"

export default function HomeScreen() {
  const { user, logout } = useAuth()

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.greeting}>Namaste{user?.name ? `, ${user.name}` : ""} 👋</Text>
      <Text style={styles.subtitle}>What would you like to do?</Text>

      <View style={styles.cards}>
        <Pressable style={styles.card} onPress={() => router.push("/(tabs)/add-product")}>
          <Text style={styles.cardEmoji}>➕</Text>
          <Text style={styles.cardTitle}>Add a product</Text>
        </Pressable>
        <Pressable style={styles.card} onPress={() => router.push("/(tabs)/catalog")}>
          <Text style={styles.cardEmoji}>🧺</Text>
          <Text style={styles.cardTitle}>Browse catalog</Text>
        </Pressable>
        <Pressable style={styles.card} onPress={() => router.push("/(tabs)/chat")}>
          <Text style={styles.cardEmoji}>💬</Text>
          <Text style={styles.cardTitle}>Messages</Text>
        </Pressable>
      </View>

      <Pressable style={styles.logout} onPress={logout}>
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 20, gap: 8 },
  greeting: { fontSize: 24, fontWeight: "700" },
  subtitle: { fontSize: 14, color: "#666", marginBottom: 16 },
  cards: { gap: 12 },
  card: { borderWidth: 1, borderColor: "#eee", borderRadius: 12, padding: 18, backgroundColor: "#fafafa" },
  cardEmoji: { fontSize: 24, marginBottom: 6 },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  logout: { marginTop: "auto", alignItems: "center", paddingVertical: 14 },
  logoutText: { color: "#c0362c", fontWeight: "600" },
})
