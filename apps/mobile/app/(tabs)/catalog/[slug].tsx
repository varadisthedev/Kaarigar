import * as React from "react"
import { View, Text, Image, ScrollView, TextInput, Pressable, ActivityIndicator, StyleSheet } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useLocalSearchParams, router } from "expo-router"
import { useQuery, useMutation } from "@tanstack/react-query"

import { apiFetch } from "@/lib/api-client"
import type { ProductDetail } from "@/lib/types"

export default function ProductDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const [message, setMessage] = React.useState("")

  const { data, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const res = await apiFetch(`/api/products/by-slug/${slug}`)
      if (!res.ok) return null
      const json = await res.json()
      return json.product as ProductDetail
    },
  })

  const sendInquiry = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/inquiries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ businessId: data!.businessId, productId: data!.id, message: message.trim() }),
      })
      if (!res.ok) throw new Error("failed")
      return (await res.json()).inquiry
    },
    onSuccess: (inquiry) => router.push(`/(tabs)/chat/${inquiry.id}`),
  })

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
      </SafeAreaView>
    )
  }

  if (!data) {
    return (
      <SafeAreaView style={styles.center}>
        <Text>Product not found.</Text>
      </SafeAreaView>
    )
  }

  const cover = data.media[0]

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {cover && <Image source={{ uri: cover.url }} style={styles.image} />}
        <View style={styles.body}>
          <Text style={styles.title}>{data.titleEn}</Text>
          {(data.priceMin || data.priceMax) && (
            <Text style={styles.price}>
              ₹{data.priceMin} – ₹{data.priceMax}
            </Text>
          )}
          {data.descriptionEn && <Text style={styles.description}>{data.descriptionEn}</Text>}

          <Text style={styles.sectionTitle}>Interested? Send an inquiry</Text>
          <TextInput
            style={styles.input}
            placeholder="I'd like to order 50 units..."
            value={message}
            onChangeText={setMessage}
            multiline
          />
          <Pressable
            style={[styles.button, (!message.trim() || sendInquiry.isPending) && styles.buttonDisabled]}
            onPress={() => sendInquiry.mutate()}
            disabled={!message.trim() || sendInquiry.isPending}
          >
            {sendInquiry.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send inquiry</Text>}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  image: { width: "100%", aspectRatio: 4 / 3, backgroundColor: "#f2f2f2" },
  body: { padding: 16, gap: 8 },
  title: { fontSize: 20, fontWeight: "700" },
  price: { fontSize: 16, fontWeight: "600", color: "#333" },
  description: { fontSize: 14, color: "#555", lineHeight: 20, marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: "600", marginTop: 16 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, minHeight: 80, textAlignVertical: "top" },
  button: { backgroundColor: "#111", borderRadius: 8, paddingVertical: 14, alignItems: "center" },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontWeight: "600" },
})
