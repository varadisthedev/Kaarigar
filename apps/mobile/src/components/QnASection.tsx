import * as React from "react"
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from "react-native"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { router } from "expo-router"

import { apiFetch } from "@/lib/api-client"
import type { Inquiry } from "@/lib/types"

type QnASectionProps = {
  businessId: string
  productId?: string
  productTitle?: string
}

export function QnASection({ businessId, productId, productTitle }: QnASectionProps) {
  const [question, setQuestion] = React.useState("")
  const queryClient = useQueryClient()

  const { data: inquiries, isLoading } = useQuery({
    queryKey: ["inquiries-for-product", productId],
    queryFn: async () => {
      const res = await apiFetch("/api/inquiries")
      if (!res.ok) return []
      const json = await res.json()
      const all = (json.inquiries ?? []) as Inquiry[]
      if (productId) {
        return all.filter((i) => i.productId === productId)
      }
      return all.filter((i) => i.businessId === businessId)
    },
  })

  const submitQuestion = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/inquiries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          businessId,
          productId,
          message: question.trim(),
        }),
      })
      if (!res.ok) throw new Error("Failed to post question")
      return (await res.json()).inquiry as Inquiry
    },
    onSuccess: (inquiry) => {
      setQuestion("")
      queryClient.invalidateQueries({ queryKey: ["inquiries-for-product", productId] })
      router.push(`/(tabs)/chat/${inquiry.id}`)
    },
  })

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>💬 Product Q&A & Inquiries</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={`Ask the artisan a question about ${productTitle ?? "this product"}...`}
          value={question}
          onChangeText={setQuestion}
          multiline
        />
        <Pressable
          style={[styles.submitBtn, (!question.trim() || submitQuestion.isPending) && styles.disabledBtn]}
          onPress={() => submitQuestion.mutate()}
          disabled={!question.trim() || submitQuestion.isPending}
        >
          {submitQuestion.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitBtnText}>Ask Question</Text>
          )}
        </Pressable>
      </View>

      <Text style={styles.subHeader}>Recent Q&A Thread ({inquiries?.length ?? 0})</Text>

      {isLoading ? (
        <ActivityIndicator style={{ marginVertical: 12 }} />
      ) : inquiries && inquiries.length > 0 ? (
        inquiries.map((item) => (
          <Pressable
            key={item.id}
            style={styles.qnaCard}
            onPress={() => router.push(`/(tabs)/chat/${item.id}`)}
          >
            <View style={styles.qnaHeader}>
              <Text style={styles.qnaStatus}>Status: {item.status.toUpperCase()}</Text>
              <Text style={styles.qnaDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
            <Text style={styles.qnaQuestion}>Q: {item.message}</Text>
            <Text style={styles.qnaAction}>Tap to view answer & chat →</Text>
          </Pressable>
        ))
      ) : (
        <Text style={styles.emptyText}>No questions asked yet. Be the first to ask!</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#f3f4f6", gap: 12 },
  sectionHeader: { fontSize: 16, fontWeight: "700", color: "#111827" },
  inputContainer: { gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 70,
    textAlignVertical: "top",
    backgroundColor: "#fff",
  },
  submitBtn: {
    backgroundColor: "#7c3aed",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  disabledBtn: { opacity: 0.5 },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  subHeader: { fontSize: 13, fontWeight: "600", color: "#4b5563", marginTop: 8 },
  emptyText: { fontSize: 13, color: "#9ca3af", fontStyle: "italic" },
  qnaCard: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  qnaHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  qnaStatus: { fontSize: 10, fontWeight: "800", color: "#7c3aed" },
  qnaDate: { fontSize: 11, color: "#9ca3af" },
  qnaQuestion: { fontSize: 13, fontWeight: "600", color: "#1f2937" },
  qnaAction: { fontSize: 11, fontWeight: "600", color: "#2563eb", marginTop: 4 },
})
