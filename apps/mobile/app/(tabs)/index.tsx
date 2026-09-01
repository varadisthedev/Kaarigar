import * as React from "react"
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native"
import { router } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useQuery } from "@tanstack/react-query"

import { useAuth } from "@/lib/auth-context"
import { apiFetch } from "@/lib/api-client"
import { CategoryBar } from "@/components/CategoryBar"
import { ProductCard } from "@/components/ProductCard"
import type { BusinessSummary, ProductSummary } from "@/lib/types"

type FlattenedProductItem = {
  product: ProductSummary
  businessName: string
  location?: string
  craftCategory: string
}

export default function MarketplaceScreen() {
  const { user, logout } = useAuth()
  const [search, setSearch] = React.useState("")
  const [selectedCategory, setSelectedCategory] = React.useState("")

  const { data: businesses, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["marketplace", search, selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.set("search", search)
      if (selectedCategory) params.set("category", selectedCategory)
      const qs = params.toString() ? `?${params.toString()}` : ""
      const res = await apiFetch(`/api/marketplace${qs}`)
      const json = await res.json()
      return (json.businesses ?? []) as BusinessSummary[]
    },
  })

  // Flatten products from businesses into card items
  const productItems = React.useMemo(() => {
    if (!businesses) return []
    const items: FlattenedProductItem[] = []
    for (const b of businesses) {
      for (const p of b.products) {
        items.push({
          product: p,
          businessName: b.displayName,
          location: b.state ?? undefined,
          craftCategory: b.craftCategory,
        })
      }
    }
    return items
  }, [businesses])

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Namaste{user?.name ? `, ${user.name}` : ""} 👋</Text>
          <Text style={styles.subtitle}>Explore B2B Craft Marketplace</Text>
        </View>
        <Pressable style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>

      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search handcrafted products, artisans, crafts..."
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => refetch()}
          returnKeyType="search"
        />
      </View>

      <CategoryBar selected={selectedCategory} onSelect={setSelectedCategory} />

      <View style={styles.quickNavRow}>
        <Pressable style={styles.quickNavBtn} onPress={() => router.push("/(tabs)/pricing")}>
          <Text style={styles.quickNavText}>💡 AI Pricing</Text>
        </Pressable>
        <Pressable style={styles.quickNavBtn} onPress={() => router.push("/(tabs)/add-product")}>
          <Text style={styles.quickNavText}>➕ Add Product</Text>
        </Pressable>
        <Pressable style={styles.quickNavBtn} onPress={() => router.push("/(tabs)/catalog")}>
          <Text style={styles.quickNavText}>🧺 Catalog</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#7c3aed" size="large" />
      ) : (
        <FlatList
          data={productItems}
          keyExtractor={(item) => `${item.product.id}-${item.product.slug}`}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No products found</Text>
              <Text style={styles.emptyBody}>Try adjusting your search query or category filter.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={{ flex: 1 }}>
              <ProductCard
                product={item.product}
                businessName={item.businessName}
                location={item.location}
                craftCategory={item.craftCategory}
                onPress={() => router.push(`/(tabs)/catalog/${item.product.slug}`)}
              />
            </View>
          )}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  greeting: { fontSize: 20, fontWeight: "800", color: "#111827" },
  subtitle: { fontSize: 12, color: "#6b7280" },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#fee2e2",
  },
  logoutText: { color: "#dc2626", fontWeight: "700", fontSize: 12 },
  searchBarContainer: { paddingHorizontal: 16, paddingVertical: 4 },
  searchInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "#f9fafb",
  },
  quickNavRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  quickNavBtn: {
    flex: 1,
    backgroundColor: "#f5f3ff",
    borderWidth: 1,
    borderColor: "#ddd6fe",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  quickNavText: { fontSize: 12, fontWeight: "700", color: "#6d28d9" },
  columnWrapper: { gap: 12, paddingHorizontal: 16 },
  listContent: { paddingBottom: 30, paddingTop: 8 },
  emptyBox: { alignItems: "center", marginTop: 40, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#374151" },
  emptyBody: { fontSize: 13, color: "#9ca3af", textAlign: "center", marginTop: 4 },
})
