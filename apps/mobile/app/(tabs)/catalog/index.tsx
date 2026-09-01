import * as React from "react"
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { useQuery } from "@tanstack/react-query"

import { apiFetch } from "@/lib/api-client"
import { ProductCard } from "@/components/ProductCard"
import type { BusinessSummary, ProductSummary } from "@/lib/types"

type MyBusiness = {
  id: string
  displayName: string
  status: string
  craftCategory: string
  state: string | null
  products?: ProductSummary[]
}

export default function CatalogScreen() {
  const [activeTab, setActiveTab] = React.useState<"marketplace" | "mine">("marketplace")
  const [search, setSearch] = React.useState("")

  const { data: marketplaceData, isLoading: loadingMarketplace, refetch: refetchMarketplace } = useQuery({
    queryKey: ["marketplace-catalog", search],
    queryFn: async () => {
      const qs = search ? `?search=${encodeURIComponent(search)}` : ""
      const res = await apiFetch(`/api/marketplace${qs}`)
      const json = await res.json()
      return (json.businesses ?? []) as BusinessSummary[]
    },
  })

  const { data: myBusinesses, isLoading: loadingMine, refetch: refetchMine } = useQuery({
    queryKey: ["my-catalog-businesses"],
    queryFn: async () => {
      const res = await apiFetch("/api/businesses/mine")
      if (!res.ok) return []
      const json = await res.json()
      return (json.businesses ?? []) as MyBusiness[]
    },
  })

  const marketplaceItems = React.useMemo(() => {
    if (!marketplaceData) return []
    const list: Array<{ product: ProductSummary; businessName: string; location?: string; category: string }> = []
    for (const b of marketplaceData) {
      for (const p of b.products) {
        list.push({
          product: p,
          businessName: b.displayName,
          location: b.state ?? undefined,
          category: b.craftCategory,
        })
      }
    }
    return list
  }, [marketplaceData])

  const myProducts = React.useMemo(() => {
    if (!myBusinesses) return []
    const list: Array<{ product: ProductSummary; businessName: string; category: string }> = []
    for (const b of myBusinesses) {
      if (b.products) {
        for (const p of b.products) {
          list.push({ product: p, businessName: b.displayName, category: b.craftCategory })
        }
      }
    }
    return list
  }, [myBusinesses])

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>🧺 Catalog Directory</Text>
        <Pressable style={styles.addBtn} onPress={() => router.push("/(tabs)/add-product")}>
          <Text style={styles.addBtnText}>+ Add Product</Text>
        </Pressable>
      </View>

      <View style={styles.segmentedControl}>
        <Pressable
          style={[styles.segmentBtn, activeTab === "marketplace" && styles.segmentBtnActive]}
          onPress={() => setActiveTab("marketplace")}
        >
          <Text style={activeTab === "marketplace" ? styles.segmentTextActive : styles.segmentText}>
            Marketplace Catalogs
          </Text>
        </Pressable>
        <Pressable
          style={[styles.segmentBtn, activeTab === "mine" && styles.segmentBtnActive]}
          onPress={() => setActiveTab("mine")}
        >
          <Text style={activeTab === "mine" ? styles.segmentTextActive : styles.segmentText}>
            My Business Catalog
          </Text>
        </Pressable>
      </View>

      {activeTab === "marketplace" ? (
        <>
          <TextInput
            style={styles.search}
            placeholder="Search products in catalog..."
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => refetchMarketplace()}
            returnKeyType="search"
          />

          {loadingMarketplace ? (
            <ActivityIndicator style={{ marginTop: 40 }} color="#7c3aed" />
          ) : (
            <FlatList
              data={marketplaceItems}
              keyExtractor={(item) => item.product.id}
              numColumns={2}
              columnWrapperStyle={styles.rowGap}
              contentContainerStyle={styles.listPadding}
              onRefresh={refetchMarketplace}
              refreshing={false}
              ListEmptyComponent={<Text style={styles.empty}>No products found in marketplace.</Text>}
              renderItem={({ item }) => (
                <View style={{ flex: 1 }}>
                  <ProductCard
                    product={item.product}
                    businessName={item.businessName}
                    location={item.location}
                    craftCategory={item.category}
                    onPress={() => router.push(`/(tabs)/catalog/${item.product.slug}`)}
                  />
                </View>
              )}
            />
          )}
        </>
      ) : (
        <>
          {loadingMine ? (
            <ActivityIndicator style={{ marginTop: 40 }} color="#7c3aed" />
          ) : (
            <FlatList
              data={myProducts}
              keyExtractor={(item) => item.product.id}
              numColumns={2}
              columnWrapperStyle={styles.rowGap}
              contentContainerStyle={styles.listPadding}
              onRefresh={refetchMine}
              refreshing={false}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyTitle}>No business products yet</Text>
                  <Text style={styles.emptySub}>
                    Tap "+ Add Product" above to publish your first handcrafted product with AI pricing!
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <View style={{ flex: 1 }}>
                  <ProductCard
                    product={item.product}
                    businessName={item.businessName}
                    craftCategory={item.category}
                    onPress={() => router.push(`/(tabs)/catalog/${item.product.slug}`)}
                  />
                </View>
              )}
            />
          )}
        </>
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
  title: { fontSize: 20, fontWeight: "800", color: "#111827" },
  addBtn: { backgroundColor: "#7c3aed", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  segmentedControl: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
    padding: 4,
  },
  segmentBtn: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 8 },
  segmentBtnActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 2 },
  segmentText: { fontSize: 13, color: "#6b7280", fontWeight: "600" },
  segmentTextActive: { fontSize: 13, color: "#7c3aed", fontWeight: "800" },
  search: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
  },
  rowGap: { gap: 12, paddingHorizontal: 16 },
  listPadding: { paddingBottom: 24, paddingTop: 4 },
  empty: { textAlign: "center", color: "#9ca3af", marginTop: 40 },
  emptyBox: { alignItems: "center", marginTop: 40, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#374151" },
  emptySub: { fontSize: 13, color: "#6b7280", textAlign: "center", marginTop: 4 },
})
