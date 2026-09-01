import * as React from "react"
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useLocalSearchParams, router } from "expo-router"
import { useQuery, useMutation } from "@tanstack/react-query"

import { apiFetch } from "@/lib/api-client"
import { QnASection } from "@/components/QnASection"
import { OrderModal } from "@/components/OrderModal"
import type { ProductDetail } from "@/lib/types"

export default function ProductDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const [selectedPhotoIndex, setSelectedPhotoIndex] = React.useState(0)
  const [orderModalOpen, setOrderModalOpen] = React.useState(false)

  const { data: product, isLoading } = useQuery({
    queryKey: ["product-detail", slug],
    queryFn: async () => {
      const res = await apiFetch(`/api/products/by-slug/${slug}`)
      if (!res.ok) return null
      const json = await res.json()
      return json.product as ProductDetail
    },
  })

  const createDirectInquiry = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/inquiries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          businessId: product!.businessId,
          productId: product!.id,
          message: `Hello! I'm interested in "${product!.titleEn}". Could you share availability and lead time?`,
        }),
      })
      if (!res.ok) throw new Error("Inquiry failed")
      return (await res.json()).inquiry
    },
    onSuccess: (inquiry) => router.push(`/(tabs)/chat/${inquiry.id}`),
  })

  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </SafeAreaView>
    )
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.notFoundText}>Product not found.</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  const activeMedia = product.media[selectedPhotoIndex] ?? product.media[0]
  const minPriceNum = Number(product.priceMin) || 0

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.imageWrap}>
          {activeMedia ? (
            <Image source={{ uri: activeMedia.url }} style={styles.mainImage} resizeMode="cover" />
          ) : (
            <View style={styles.placeholderImg}>
              <Text style={{ fontSize: 40 }}>🎨</Text>
            </View>
          )}

          <Pressable style={styles.navBack} onPress={() => router.back()}>
            <Text style={styles.navBackText}>← Back</Text>
          </Pressable>
        </View>

        {product.media.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryRow}>
            {product.media.map((m, idx) => (
              <Pressable
                key={m.url + idx}
                onPress={() => setSelectedPhotoIndex(idx)}
                style={[styles.thumbWrap, selectedPhotoIndex === idx && styles.thumbActive]}
              >
                <Image source={{ uri: m.url }} style={styles.thumbImage} />
              </Pressable>
            ))}
          </ScrollView>
        )}

        <View style={styles.body}>
          {product.craftCategory && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{product.craftCategory.toUpperCase()}</Text>
            </View>
          )}

          <Text style={styles.title}>{product.titleEn}</Text>

          {(product.priceMin || product.priceMax) && (
            <Text style={styles.price}>
              ₹{product.priceMin} {product.priceMax && product.priceMax !== product.priceMin ? `– ₹${product.priceMax}` : ""}
            </Text>
          )}

          {product.business && (
            <View style={styles.businessCard}>
              <Text style={styles.artisanName}>Artisan: {product.business.displayName}</Text>
              <Text style={styles.artisanMeta}>
                {product.business.craftCategory} {product.business.state ? `· ${product.business.state}` : ""}
              </Text>
            </View>
          )}

          {product.descriptionEn && (
            <View style={styles.descSection}>
              <Text style={styles.sectionLabel}>Product Rationale & Description</Text>
              <Text style={styles.description}>{product.descriptionEn}</Text>
            </View>
          )}

          <View style={styles.actionRow}>
            <Pressable
              style={styles.orderBtn}
              onPress={() => setOrderModalOpen(true)}
            >
              <Text style={styles.orderBtnText}>📦 Place B2B Order</Text>
            </Pressable>

            <Pressable
              style={[styles.chatBtn, createDirectInquiry.isPending && styles.disabledBtn]}
              onPress={() => createDirectInquiry.mutate()}
              disabled={createDirectInquiry.isPending}
            >
              {createDirectInquiry.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.chatBtnText}>💬 Chat with Artisan</Text>
              )}
            </Pressable>
          </View>

          <QnASection
            businessId={product.businessId}
            productId={product.id}
            productTitle={product.titleEn}
          />
        </View>
      </ScrollView>

      <OrderModal
        visible={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        businessId={product.businessId}
        productId={product.id}
        productTitle={product.titleEn}
        unitPrice={minPriceNum || 500}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff", gap: 12 },
  notFoundText: { fontSize: 16, color: "#6b7280" },
  backBtn: { backgroundColor: "#111827", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  backBtnText: { color: "#fff", fontWeight: "700" },
  imageWrap: { width: "100%", aspectRatio: 4 / 3, backgroundColor: "#f3f4f6", position: "relative" },
  mainImage: { width: "100%", height: "100%" },
  placeholderImg: { flex: 1, alignItems: "center", justifyContent: "center" },
  navBack: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  navBackText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  galleryRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  thumbWrap: { width: 60, height: 60, borderRadius: 8, overflow: "hidden", borderWidth: 2, borderColor: "transparent" },
  thumbActive: { borderColor: "#7c3aed" },
  thumbImage: { width: "100%", height: "100%" },
  body: { padding: 16, gap: 10 },
  categoryBadge: { alignSelf: "flex-start", backgroundColor: "#f3e8ff", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  categoryBadgeText: { color: "#6d28d9", fontWeight: "800", fontSize: 11 },
  title: { fontSize: 22, fontWeight: "800", color: "#111827" },
  price: { fontSize: 20, fontWeight: "800", color: "#7c3aed" },
  businessCard: { backgroundColor: "#f9fafb", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 12, gap: 2 },
  artisanName: { fontSize: 14, fontWeight: "700", color: "#1f2937" },
  artisanMeta: { fontSize: 12, color: "#6b7280" },
  descSection: { marginTop: 4, gap: 4 },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: "#374151" },
  description: { fontSize: 14, color: "#4b5563", lineHeight: 22 },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  orderBtn: { flex: 1, backgroundColor: "#111827", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  orderBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  chatBtn: { flex: 1, backgroundColor: "#7c3aed", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  disabledBtn: { opacity: 0.6 },
  chatBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
})
