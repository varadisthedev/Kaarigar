import * as React from "react"
import { View, Text, Image, Pressable, StyleSheet } from "react-native"
import type { ProductSummary } from "@/lib/types"

type ProductCardProps = {
  product: ProductSummary
  businessName?: string
  location?: string
  craftCategory?: string
  onPress: () => void
}

function formatPrice(min?: string | null, max?: string | null) {
  if (!min && !max) return "Price on request"
  if (min && max && min !== max) return `₹${min} – ₹${max}`
  return `₹${min ?? max}`
}

export function ProductCard({ product, businessName, location, craftCategory, onPress }: ProductCardProps) {
  const cover = product.media.find((m) => m.isPrimary) ?? product.media[0]

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.imageContainer}>
        {cover ? (
          <Image source={{ uri: cover.url }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>🎨</Text>
          </View>
        )}
        {craftCategory && (
          <View style={styles.badge}>
            <Text style={styles.badgeText} numberOfLines={1}>{craftCategory}</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {product.titleEn}
        </Text>
        {businessName && (
          <Text style={styles.subtext} numberOfLines={1}>
            {businessName} {location ? `· ${location}` : ""}
          </Text>
        )}
        <Text style={styles.price}>{formatPrice(product.priceMin, product.priceMax)}</Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12,
  },
  imageContainer: {
    width: "100%",
    aspectRatio: 4 / 3,
    backgroundColor: "#f7f7f8",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    fontSize: 32,
  },
  badge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(17, 24, 39, 0.8)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  body: {
    padding: 10,
    gap: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  subtext: {
    fontSize: 11,
    color: "#6b7280",
  },
  price: {
    fontSize: 13,
    fontWeight: "700",
    color: "#7c3aed",
    marginTop: 2,
  },
})
