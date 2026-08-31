import * as React from "react"
import { View, Text, Image, FlatList, Pressable, TextInput, ActivityIndicator, StyleSheet } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router } from "expo-router"
import { useQuery } from "@tanstack/react-query"

import { apiFetch } from "@/lib/api-client"
import type { BusinessSummary } from "@/lib/types"

function formatPriceRange(min?: string | null, max?: string | null) {
  if (!min && !max) return "Price on request"
  if (min && max) return `₹${min} – ₹${max}`
  return `₹${min ?? max}`
}

export default function CatalogScreen() {
  const [search, setSearch] = React.useState("")

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["marketplace", search],
    queryFn: async () => {
      const qs = search ? `?search=${encodeURIComponent(search)}` : ""
      const res = await apiFetch(`/api/marketplace${qs}`)
      const json = await res.json()
      return json.businesses as BusinessSummary[]
    },
  })

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <TextInput
        style={styles.search}
        placeholder="Search products or artisans"
        value={search}
        onChangeText={setSearch}
        onSubmitEditing={() => refetch()}
        returnKeyType="search"
      />
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(b) => b.id}
          numColumns={2}
          refreshing={isRefetching}
          onRefresh={refetch}
          contentContainerStyle={styles.list}
          columnWrapperStyle={{ gap: 12 }}
          ListEmptyComponent={<Text style={styles.empty}>No businesses found.</Text>}
          renderItem={({ item }) => {
            const cover = item.media.find((m) => m.isPrimary) ?? item.media[0]
            const prices = item.products.flatMap((p) => [p.priceMin, p.priceMax]).filter(Boolean) as string[]
            const min = prices.length ? Math.min(...prices.map(Number)) : null
            const max = prices.length ? Math.max(...prices.map(Number)) : null
            const firstSlug = item.products[0]?.slug
            return (
              <Pressable
                style={styles.card}
                onPress={() => firstSlug && router.push(`/(tabs)/catalog/${firstSlug}`)}
                disabled={!firstSlug}
              >
                {cover ? (
                  <Image source={{ uri: cover.url }} style={styles.image} />
                ) : (
                  <View style={[styles.image, styles.imagePlaceholder]} />
                )}
                <Text style={styles.name} numberOfLines={1}>
                  {item.displayName}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {item.craftCategory} · {item.state}
                </Text>
                <Text style={styles.price}>{formatPriceRange(min?.toString(), max?.toString())}</Text>
              </Pressable>
            )
          }}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  search: { margin: 16, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  empty: { textAlign: "center", color: "#888", marginTop: 40 },
  card: { flex: 1, borderWidth: 1, borderColor: "#eee", borderRadius: 10, overflow: "hidden", marginBottom: 12 },
  image: { width: "100%", aspectRatio: 4 / 3, backgroundColor: "#f2f2f2" },
  imagePlaceholder: { alignItems: "center", justifyContent: "center" },
  name: { fontSize: 13, fontWeight: "600", marginTop: 6, marginHorizontal: 8 },
  meta: { fontSize: 11, color: "#888", marginHorizontal: 8 },
  price: { fontSize: 13, fontWeight: "600", marginHorizontal: 8, marginTop: 2, marginBottom: 8 },
})
