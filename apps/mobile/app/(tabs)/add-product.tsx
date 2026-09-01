import * as React from "react"
import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import * as ImagePicker from "expo-image-picker"
import { useAudioRecorder, requestRecordingPermissionsAsync, setAudioModeAsync, RecordingPresets } from "expo-audio"
import { useQuery, useMutation } from "@tanstack/react-query"
import { router } from "expo-router"

import { apiFetch } from "@/lib/api-client"
import { uploadToCloudinary } from "@/lib/cloudinary-upload"
import { transcribeProductVoice } from "@/lib/voice"
import { CategoryBar } from "@/components/CategoryBar"

type Business = { id: string; displayName: string; status: string; craftCategory: string; state: string | null }
type Photo = { localUri: string; uploaded?: { url: string; publicId: string } }

export default function AddProductScreen() {
  const draftId = React.useRef(`mobile-${Date.now()}`).current
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)
  const [isRecording, setIsRecording] = React.useState(false)
  const [transcribing, setTranscribing] = React.useState(false)

  const [businessId, setBusinessId] = React.useState<string | null>(null)
  const [title, setTitle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [category, setCategory] = React.useState("")
  const [priceMin, setPriceMin] = React.useState("")
  const [priceMax, setPriceMax] = React.useState("")
  const [materialCost, setMaterialCost] = React.useState("")
  const [suggestion, setSuggestion] = React.useState<{ price: number; marketMin: number; marketMax: number; rationaleEn?: string } | null>(null)
  const [photos, setPhotos] = React.useState<Photo[]>([])
  const [submitted, setSubmitted] = React.useState(false)

  const { data: businesses } = useQuery({
    queryKey: ["businesses-mine"],
    queryFn: async () => {
      const res = await apiFetch("/api/businesses/mine")
      if (!res.ok) return []
      const json = await res.json()
      return (json.businesses as Business[]).filter((b) => b.status === "approved")
    },
  })

  React.useEffect(() => {
    if (businesses?.length && !businessId) {
      setBusinessId(businesses[0].id)
      if (!category) setCategory(businesses[0].craftCategory)
    }
  }, [businesses, businessId, category])

  const business = businesses?.find((b) => b.id === businessId)

  async function startRecording() {
    const perm = await requestRecordingPermissionsAsync()
    if (!perm.granted) return
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
    await recorder.prepareToRecordAsync()
    recorder.record()
    setIsRecording(true)
  }

  async function stopRecording() {
    await recorder.stop()
    setIsRecording(false)
    const uri = recorder.uri
    if (!uri) return
    setTranscribing(true)
    try {
      const draft = await transcribeProductVoice(uri, draftId)
      if (draft) {
        if (draft.titleEn) setTitle(draft.titleEn)
        if (draft.descriptionEn) setDescription(draft.descriptionEn)
      }
    } finally {
      setTranscribing(false)
    }
  }

  const suggestPrice = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/pricing/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          category: category || business?.craftCategory || "Crafts",
          region: business?.state,
          descriptionEn: description,
          materialCost: materialCost ? Number(materialCost) : undefined,
          locale: "en",
        }),
      })
      if (!res.ok) return null
      return res.json()
    },
    onSuccess: (data) =>
      data &&
      setSuggestion({
        price: data.price,
        marketMin: data.marketMin,
        marketMax: data.marketMax,
        rationaleEn: data.rationaleEn,
      }),
  })

  React.useEffect(() => {
    if (business && (title || description) && !suggestPrice.isPending && suggestion == null) {
      suggestPrice.mutate()
    }
  }, [business, title, description])

  async function pickPhotos() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.85,
      selectionLimit: 6,
    })
    if (result.canceled) return
    const picked = result.assets.map((a) => ({ localUri: a.uri }))
    setPhotos((prev) => [...prev, ...picked])
    for (const p of picked) {
      uploadToCloudinary(p.localUri, "product_photo")
        .then((uploaded) =>
          setPhotos((prev) => prev.map((x) => (x.localUri === p.localUri ? { ...x, uploaded } : x)))
        )
        .catch(() => setPhotos((prev) => prev.filter((x) => x.localUri !== p.localUri)))
    }
  }

  const readyPhotos = photos.filter((p) => p.uploaded)
  const uploading = photos.length > readyPhotos.length

  const submit = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          businessId,
          titleEn: title.trim() || "Untitled Product",
          descriptionEn: description.trim() || undefined,
          craftCategory: category || business?.craftCategory,
          priceMin: priceMin ? Number(priceMin) : undefined,
          priceMax: priceMax ? Number(priceMax) : undefined,
          photos: readyPhotos.map((p) => ({ url: p.uploaded!.url, publicId: p.uploaded!.publicId })),
        }),
      })
      if (!res.ok) throw new Error("Product publish failed")
      return res.json()
    },
    onSuccess: () => {
      setSubmitted(true)
      setTimeout(() => router.replace("/(tabs)/catalog"), 1200)
    },
  })

  if (businesses && businesses.length === 0) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.emptyTitle}>No approved business yet</Text>
        <Text style={styles.emptyBody}>
          Complete artisan onboarding on the web app first, then come back here to publish handcrafted products.
        </Text>
      </SafeAreaView>
    )
  }

  if (submitted) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.emptyTitle}>Product Published Successfully ✓</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <Text style={styles.header}>➕ Publish Product Listing</Text>

        {businesses && businesses.length > 1 && (
          <View style={styles.chipRow}>
            {businesses.map((b) => (
              <Pressable
                key={b.id}
                style={[styles.chip, businessId === b.id && styles.chipActive]}
                onPress={() => {
                  setBusinessId(b.id)
                  setCategory(b.craftCategory)
                }}
              >
                <Text style={businessId === b.id ? styles.chipTextActive : styles.chipText}>{b.displayName}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <Pressable
          style={[styles.voiceButton, isRecording && styles.voiceButtonActive]}
          onPress={isRecording ? stopRecording : startRecording}
          disabled={transcribing}
        >
          {transcribing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.voiceButtonText}>
              {isRecording ? "⏹ Stop Recording & Extract Title/Desc" : "🎤 Speak & Describe Product (Sarvam AI STT)"}
            </Text>
          )}
        </Pressable>

        <View style={styles.field}>
          <Text style={styles.label}>Product Title</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Hand-carved Wooden Jewelry Box" />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Craft Category</Text>
          <CategoryBar selected={category} onSelect={setCategory} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Description & Craft Technique</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="Materials used, dimensions, origin, traditional craft techniques..."
            multiline
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Material Cost (₹)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={materialCost}
            onChangeText={setMaterialCost}
            placeholder="What raw materials cost you"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>B2B Price Range (₹)</Text>
          <View style={styles.priceRow}>
            <TextInput style={[styles.input, { flex: 1 }]} keyboardType="numeric" value={priceMin} onChangeText={setPriceMin} placeholder="Min Price" />
            <TextInput style={[styles.input, { flex: 1 }]} keyboardType="numeric" value={priceMax} onChangeText={setPriceMax} placeholder="Max Price" />
          </View>
          <Pressable onPress={() => suggestPrice.mutate()} disabled={suggestPrice.isPending}>
            <Text style={styles.link}>
              {suggestPrice.isPending ? "Calculating AI price..." : "✨ Calculate AI Price Recommendation"}
            </Text>
          </Pressable>
          {suggestion != null && (
            <View style={styles.priceBreakdown}>
              {materialCost !== "" && <Text style={styles.breakdownLine}>Material cost: ₹{materialCost}</Text>}
              <Text style={styles.breakdownLine}>
                Market range: ₹{suggestion.marketMin} – ₹{suggestion.marketMax}
              </Text>
              {suggestion.rationaleEn && <Text style={styles.breakdownLine}>AI Rationale: {suggestion.rationaleEn}</Text>}
              <Pressable
                onPress={() => {
                  setPriceMin(String(suggestion.price))
                  setPriceMax(String(suggestion.price))
                }}
              >
                <Text style={styles.suggestion}>Suggested Price: ₹{suggestion.price} (Tap to apply)</Text>
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Product Photos ({readyPhotos.length} uploaded)</Text>
          <View style={styles.photoRow}>
            {photos.map((p) => (
              <View key={p.localUri} style={styles.photoWrap}>
                <Image source={{ uri: p.localUri }} style={styles.photo} />
                {!p.uploaded && <ActivityIndicator style={StyleSheet.absoluteFill} color="#fff" />}
              </View>
            ))}
            <Pressable style={styles.addPhoto} onPress={pickPhotos}>
              <Text style={{ fontSize: 24, color: "#6b7280" }}>+</Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          style={[styles.submitButton, (readyPhotos.length === 0 || uploading || submit.isPending) && styles.buttonDisabled]}
          onPress={() => submit.mutate()}
          disabled={readyPhotos.length === 0 || uploading || submit.isPending || !businessId}
        >
          {submit.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Publish Product Listing</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff", padding: 24, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  emptyBody: { fontSize: 14, color: "#6b7280", textAlign: "center" },
  header: { fontSize: 22, fontWeight: "800", color: "#111827" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: "#f9fafb" },
  chipActive: { backgroundColor: "#7c3aed", borderColor: "#7c3aed" },
  chipText: { fontSize: 13, color: "#374151" },
  chipTextActive: { fontSize: 13, color: "#fff", fontWeight: "700" },
  voiceButton: { backgroundColor: "#7c3aed", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  voiceButtonActive: { backgroundColor: "#dc2626" },
  voiceButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: "700", color: "#374151" },
  input: { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: "#111827" },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  priceRow: { flexDirection: "row", gap: 8 },
  link: { color: "#7c3aed", fontSize: 13, marginTop: 4, fontWeight: "700" },
  priceBreakdown: { marginTop: 8, gap: 4, borderWidth: 1, borderColor: "#ddd6fe", borderRadius: 8, padding: 12, backgroundColor: "#f5f3ff" },
  breakdownLine: { fontSize: 13, color: "#4c1d95" },
  suggestion: { color: "#059669", fontSize: 14, fontWeight: "800", marginTop: 4 },
  photoRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photoWrap: { width: 80, height: 80, borderRadius: 8, overflow: "hidden", backgroundColor: "#000" },
  photo: { width: "100%", height: "100%" },
  addPhoto: { width: 80, height: 80, borderRadius: 8, borderWidth: 1, borderColor: "#d1d5db", alignItems: "center", justifyContent: "center", backgroundColor: "#f9fafb" },
  submitButton: { backgroundColor: "#111827", borderRadius: 10, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  buttonDisabled: { opacity: 0.5 },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 15 },
})
