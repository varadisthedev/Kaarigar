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
  const [priceMin, setPriceMin] = React.useState("")
  const [priceMax, setPriceMax] = React.useState("")
  const [suggestion, setSuggestion] = React.useState<{ min: number; max: number } | null>(null)
  const [photos, setPhotos] = React.useState<Photo[]>([])
  const [submitted, setSubmitted] = React.useState(false)

  const { data: businesses } = useQuery({
    queryKey: ["businesses-mine"],
    queryFn: async () => {
      const res = await apiFetch("/api/businesses/mine")
      const json = await res.json()
      return (json.businesses as Business[]).filter((b) => b.status === "approved")
    },
  })

  React.useEffect(() => {
    if (businesses?.length && !businessId) setBusinessId(businesses[0].id)
  }, [businesses, businessId])

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
        body: JSON.stringify({ category: business?.craftCategory, region: business?.state, descriptionEn: description, locale: "en" }),
      })
      if (!res.ok) return null
      return res.json()
    },
    onSuccess: (data) => data && setSuggestion({ min: data.min, max: data.max }),
  })

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
        .then((uploaded) => setPhotos((prev) => prev.map((x) => (x.localUri === p.localUri ? { ...x, uploaded } : x))))
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
          titleEn: title.trim() || "Untitled product",
          descriptionEn: description.trim() || undefined,
          priceMin: priceMin ? Number(priceMin) : undefined,
          priceMax: priceMax ? Number(priceMax) : undefined,
          photos: readyPhotos.map((p) => ({ url: p.uploaded!.url, publicId: p.uploaded!.publicId })),
        }),
      })
      if (!res.ok) throw new Error("failed")
      return res.json()
    },
    onSuccess: () => {
      setSubmitted(true)
      setTimeout(() => router.replace("/(tabs)"), 1200)
    },
  })

  if (businesses && businesses.length === 0) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.emptyTitle}>No approved business yet</Text>
        <Text style={styles.emptyBody}>Complete onboarding on the web app first, then come back here to add products.</Text>
      </SafeAreaView>
    )
  }

  if (submitted) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.emptyTitle}>Product added ✓</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
        <Text style={styles.header}>Add a product</Text>

        {businesses && businesses.length > 1 && (
          <View style={styles.chipRow}>
            {businesses.map((b) => (
              <Pressable
                key={b.id}
                style={[styles.chip, businessId === b.id && styles.chipActive]}
                onPress={() => setBusinessId(b.id)}
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
            <Text style={styles.voiceButtonText}>{isRecording ? "⏹ Stop & fill fields" : "🎤 Describe your product"}</Text>
          )}
        </Pressable>

        <View style={styles.field}>
          <Text style={styles.label}>Title</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Hand-carved wooden bowl" />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="Materials, dimensions, craft technique..."
            multiline
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Price range (₹)</Text>
          <View style={styles.priceRow}>
            <TextInput style={[styles.input, { flex: 1 }]} keyboardType="numeric" value={priceMin} onChangeText={setPriceMin} placeholder="Min" />
            <TextInput style={[styles.input, { flex: 1 }]} keyboardType="numeric" value={priceMax} onChangeText={setPriceMax} placeholder="Max" />
          </View>
          <Pressable onPress={() => suggestPrice.mutate()} disabled={suggestPrice.isPending}>
            <Text style={styles.link}>
              {suggestPrice.isPending ? "Getting suggestion..." : "Get a market price suggestion"}
            </Text>
          </Pressable>
          {suggestion && (
            <Pressable
              onPress={() => {
                setPriceMin(String(suggestion.min))
                setPriceMax(String(suggestion.max))
              }}
            >
              <Text style={styles.suggestion}>
                Suggested: ₹{suggestion.min} – ₹{suggestion.max} · tap to use
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Photos</Text>
          <View style={styles.photoRow}>
            {photos.map((p) => (
              <View key={p.localUri} style={styles.photoWrap}>
                <Image source={{ uri: p.localUri }} style={styles.photo} />
                {!p.uploaded && <ActivityIndicator style={StyleSheet.absoluteFill} />}
              </View>
            ))}
            <Pressable style={styles.addPhoto} onPress={pickPhotos}>
              <Text style={{ fontSize: 24 }}>+</Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          style={[styles.submitButton, (readyPhotos.length === 0 || uploading || submit.isPending) && styles.buttonDisabled]}
          onPress={() => submit.mutate()}
          disabled={readyPhotos.length === 0 || uploading || submit.isPending || !businessId}
        >
          {submit.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Publish product</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff", padding: 24, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyBody: { fontSize: 14, color: "#666", textAlign: "center" },
  header: { fontSize: 22, fontWeight: "700" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: "#ddd", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive: { backgroundColor: "#111", borderColor: "#111" },
  chipText: { fontSize: 13 },
  chipTextActive: { fontSize: 13, color: "#fff" },
  voiceButton: { backgroundColor: "#7a4fd6", borderRadius: 12, paddingVertical: 16, alignItems: "center" },
  voiceButtonActive: { backgroundColor: "#c0362c" },
  voiceButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: "600", color: "#333" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  priceRow: { flexDirection: "row", gap: 8 },
  link: { color: "#7a4fd6", fontSize: 13, marginTop: 4 },
  suggestion: { color: "#2a7a2a", fontSize: 13, marginTop: 2 },
  photoRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photoWrap: { width: 80, height: 80, borderRadius: 8, overflow: "hidden" },
  photo: { width: "100%", height: "100%" },
  addPhoto: { width: 80, height: 80, borderRadius: 8, borderWidth: 1, borderColor: "#ddd", alignItems: "center", justifyContent: "center" },
  submitButton: { backgroundColor: "#111", borderRadius: 10, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  buttonDisabled: { opacity: 0.5 },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 15 },
})
