import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { useQuery } from "@tanstack/react-query"

import { apiFetch } from "@/lib/api-client"
import type { Inquiry } from "@/lib/types"

export default function ChatListScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["inquiries"],
    queryFn: async () => {
      const res = await apiFetch("/api/inquiries")
      const json = await res.json()
      return json.inquiries as Inquiry[]
    },
    refetchInterval: 15_000,
  })

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Text style={styles.header}>Messages</Text>
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(i) => i.id}
          refreshing={isRefetching}
          onRefresh={refetch}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          ListEmptyComponent={<Text style={styles.empty}>No conversations yet.</Text>}
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => router.push(`/(tabs)/chat/${item.id}`)}>
              <Text numberOfLines={1} style={styles.message}>
                {item.message}
              </Text>
              <Text style={styles.status}>{item.status}</Text>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { fontSize: 22, fontWeight: "700", paddingHorizontal: 16, paddingBottom: 8 },
  empty: { textAlign: "center", color: "#888", marginTop: 40 },
  row: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#eee" },
  message: { fontSize: 15, fontWeight: "500" },
  status: { fontSize: 12, color: "#888", marginTop: 2, textTransform: "capitalize" },
})
