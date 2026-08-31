import * as React from "react"
import { View, Text, FlatList, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useLocalSearchParams } from "expo-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

import { apiFetch } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import type { ChatMessage } from "@/lib/types"

export default function ChatThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const [draft, setDraft] = React.useState("")
  const qc = useQueryClient()

  const { data } = useQuery({
    queryKey: ["messages", id],
    queryFn: async () => {
      const res = await apiFetch(`/api/inquiries/${id}/messages`)
      const json = await res.json()
      return json.messages as ChatMessage[]
    },
    refetchInterval: 4_000,
  })

  const send = useMutation({
    mutationFn: async (body: string) => {
      const res = await apiFetch(`/api/inquiries/${id}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body }),
      })
      if (!res.ok) throw new Error("failed")
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
        <FlatList
          data={data ?? []}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          renderItem={({ item }) => {
            const mine = item.senderId === user?.id
            return (
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                <Text style={mine ? styles.bubbleTextMine : styles.bubbleText}>{item.body}</Text>
              </View>
            )
          }}
        />
        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message"
            value={draft}
            onChangeText={setDraft}
            multiline
          />
          <Pressable
            style={[styles.sendButton, !draft.trim() && styles.sendButtonDisabled]}
            onPress={() => draft.trim() && send.mutate(draft.trim())}
            disabled={!draft.trim() || send.isPending}
          >
            <Text style={styles.sendText}>Send</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  bubble: { maxWidth: "80%", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine: { backgroundColor: "#111", alignSelf: "flex-end" },
  bubbleTheirs: { backgroundColor: "#f0f0f0", alignSelf: "flex-start" },
  bubbleText: { color: "#111", fontSize: 14 },
  bubbleTextMine: { color: "#fff", fontSize: 14 },
  composer: { flexDirection: "row", gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: "#eee", alignItems: "flex-end" },
  input: { flex: 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, maxHeight: 100 },
  sendButton: { backgroundColor: "#111", borderRadius: 20, paddingHorizontal: 18, paddingVertical: 10 },
  sendButtonDisabled: { opacity: 0.5 },
  sendText: { color: "#fff", fontWeight: "600" },
})
