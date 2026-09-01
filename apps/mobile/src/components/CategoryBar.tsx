import * as React from "react"
import { ScrollView, Pressable, Text, StyleSheet } from "react-native"

export const CRAFT_CATEGORIES = [
  "All",
  "Pottery & Ceramics",
  "Textiles & Weaving",
  "Woodwork & Carving",
  "Metalware & Brass",
  "Jewelry & Ornaments",
  "Leathercraft",
  "Painting & Art",
  "Stone Craft",
]

type CategoryBarProps = {
  selected: string
  onSelect: (category: string) => void
}

export function CategoryBar({ selected, onSelect }: CategoryBarProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {CRAFT_CATEGORIES.map((cat) => {
        const active = selected === cat || (selected === "" && cat === "All")
        return (
          <Pressable
            key={cat}
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onSelect(cat === "All" ? "" : cat)}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>{cat}</Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  chipActive: {
    backgroundColor: "#7c3aed",
    borderColor: "#7c3aed",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
  },
  chipTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
})
