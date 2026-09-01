import * as React from "react"
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useLocalSearchParams, router } from "expo-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

import { apiFetch } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import type { ChatMessage } from "@/lib/types"

export default function ChatThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const [draft, setDraft] = React.useState("")
  const flatListRef = React.useRef<FlatList>(null)
  const qc = useQueryClient()

  const { data: messages, isLoading } = useQuery({
    queryKey: ["messages", id],
    queryFn: async () => {
      const res = await apiFetch(`/api/inquiries/${id}/messages`)
      if (!res.ok) return []
      const json = await res.json()
      return (json.messages ?? []) as ChatMessage[]
    },
    refetchInterval: 3_000,
  })

  const send = useMutation({
    mutationFn: async (body: string) => {
      const res = await apiFetch(`/api/inquiries/${id}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body }),
      })
      if (!res.ok) throw new Error("Failed to send message")
      return (await res.json()).message as ChatMessage
    },
    onSuccess: () => {
      setDraft("")
      qc.invalidateQueries({ queryKey: ["messages", id] })
    },
  })

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.topHeader}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>← Back</Text>
          </Pressable>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>Chat Thread</Text>
            <Text style={styles.headerSub}>ID: {id.slice(0, 8)}...</Text>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color="#7c3aed" />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages ?? []}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) => {
              const isMine = item.senderId === user?.id
              return (
                <View style={[styles.bubbleWrap, isMine ? styles.bubbleWrapMine : styles.bubbleWrapTheirs]}>
                  <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    <Text style={isMine ? styles.bubbleTextMine : styles.bubbleText}>{item.body}</Text>
                  </View>
                  <Text style={styles.timestamp}>
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
              )
            }}
          />
        )}

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            placeholder="Type your message..."
            value={draft}
            onChangeText={setDraft}
            multiline
          />
          <Pressable
            style={[styles.sendButton, (!draft.trim() || send.isPending) && styles.sendButtonDisabled]}
            onPress={() => draft.trim() && send.mutate(draft.trim())}
            disabled={!draft.trim() || send.isPending}
          >
            {send.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.sendText}>Send</Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    gap: 12,
  },
  backBtn: { backgroundColor: "#f3f4f6", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  backBtnText: { fontSize: 13, fontWeight: "700", color: "#374151" },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  headerSub: { fontSize: 11, color: "#6b7280" },
  messageList: { padding: 16, gap: 10 },
  bubbleWrap: { maxWidth: "80%", marginVertical: 2 },
  bubbleWrapMine: { alignSelf: "flex-end", alignItems: "flex-end" },
  bubbleWrapTheirs: { alignSelf: "flex-start", alignItems: "flex-start" },
  bubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine: { backgroundColor: "#7c3aed" },
  bubbleTheirs: { backgroundColor: "#f3f4f6" },
  bubbleText: { color: "#111827", fontSize: 14, lineHeight: 20 },
  bubbleTextMine: { color: "#ffffff", fontSize: 14, lineHeight: 20 },
  timestamp: { fontSize: 10, color: "#9ca3af", marginTop: 2, paddingHorizontal: 4 },
  composer: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    alignItems: "flex-end",
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 14,
    backgroundColor: "#f9fafb",
  },
  sendButton: { backgroundColor: "#7c3aed", borderRadius: 20, paddingHorizontal: 18, paddingVertical: 10 },
  sendButtonDisabled: { opacity: 0.5 },
  sendText: { color: "#fff", fontWeight: "700", fontSize: 14 },
})
