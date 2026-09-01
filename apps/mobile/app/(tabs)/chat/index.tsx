import * as React from "react"
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { useQuery } from "@tanstack/react-query"

import { apiFetch } from "@/lib/api-client"
import type { Inquiry } from "@/lib/types"

export default function ChatListScreen() {
  const { data: inquiries, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["inquiries-list"],
    queryFn: async () => {
      const res = await apiFetch("/api/inquiries")
      if (!res.ok) return []
      const json = await res.json()
      return (json.inquiries ?? []) as Inquiry[]
    },
    refetchInterval: 5_000,
  })

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>💬 Messages & Q&A</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#7c3aed" size="large" />
      ) : (
        <FlatList
          data={inquiries ?? []}
          keyExtractor={(item) => item.id}
          refreshing={isRefetching}
          onRefresh={refetch}
          contentContainerStyle={styles.listPadding}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No active conversations</Text>
              <Text style={styles.emptySub}>
                Inquiries and product Q&A threads with artisans will appear here.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/(tabs)/chat/${item.id}`)}
            >
              <View style={styles.cardTop}>
                <Text style={styles.businessName} numberOfLines={1}>
                  {item.businessName ?? "Business Inquiry"}
                </Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                </View>
              </View>

              {item.productTitle && (
                <Text style={styles.productTitle} numberOfLines={1}>
                  📦 {item.productTitle} {item.quantity ? `(${item.quantity} units)` : ""}
                </Text>
              )}

              <Text style={styles.lastMessage} numberOfLines={2}>
                {item.lastMessage || item.message}
              </Text>

              <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: "800", color: "#111827" },
  listPadding: { padding: 16, gap: 12 },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 14,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  businessName: { fontSize: 15, fontWeight: "700", color: "#111827", flex: 1 },
  statusBadge: { backgroundColor: "#f3e8ff", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { color: "#6d28d9", fontSize: 10, fontWeight: "800" },
  productTitle: { fontSize: 13, color: "#4b5563", fontWeight: "600" },
  lastMessage: { fontSize: 13, color: "#374151" },
  time: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  emptyBox: { alignItems: "center", marginTop: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#374151" },
  emptySub: { fontSize: 13, color: "#9ca3af", textAlign: "center", marginTop: 4 },
})
