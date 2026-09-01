import * as React from "react"
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from "react-native"
import { useAudioRecorder, requestRecordingPermissionsAsync, setAudioModeAsync, RecordingPresets } from "expo-audio"
import { useMutation } from "@tanstack/react-query"

import { apiFetch } from "@/lib/api-client"
import { transcribeProductVoice } from "@/lib/voice"
import type { PriceSuggestionResult } from "@/lib/types"

type NLPPriceEstimatorProps = {
  initialCategory?: string
  initialDescription?: string
  onApplyPrice?: (suggestedPrice: number, marketMin: number, marketMax: number) => void
}

export function NLPPriceEstimator({
  initialCategory = "Woodwork & Carving",
  initialDescription = "",
  onApplyPrice,
}: NLPPriceEstimatorProps) {
  const draftId = React.useRef(`nlp-${Date.now()}`).current
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)

  const [isRecording, setIsRecording] = React.useState(false)
  const [transcribing, setTranscribing] = React.useState(false)

  const [category, setCategory] = React.useState(initialCategory)
  const [description, setDescription] = React.useState(initialDescription)
  const [materialCost, setMaterialCost] = React.useState("")
  const [experienceYears, setExperienceYears] = React.useState("5")
  const [region, setRegion] = React.useState("Rajasthan")
  const [result, setResult] = React.useState<PriceSuggestionResult | null>(null)

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
      if (draft?.descriptionEn) {
        setDescription(draft.descriptionEn)
      }
    } finally {
      setTranscribing(false)
    }
  }

  const estimatePrice = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/pricing/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          category,
          region,
          descriptionEn: description,
          materialCost: materialCost ? Number(materialCost) : undefined,
          experienceYears: Number(experienceYears) || 5,
          locale: "en",
        }),
      })
      if (!res.ok) throw new Error("Price estimation failed")
      return (await res.json()) as PriceSuggestionResult
    },
    onSuccess: (data) => setResult(data),
  })

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.cardHeader}>
        <Text style={styles.heading}>✨ AI & Voice NLP Price Estimator</Text>
        <Text style={styles.subheading}>
          Describe your handcrafted product or record voice to get market pricing insights powered by AI models.
        </Text>
      </View>

      <Pressable
        style={[styles.voiceButton, isRecording && styles.voiceButtonActive]}
        onPress={isRecording ? stopRecording : startRecording}
        disabled={transcribing}
      >
        {transcribing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.voiceButtonText}>
            {isRecording ? "⏹ Stop Recording & Extract NLP" : "🎤 Tap & Speak Product Details"}
          </Text>
        )}
      </Pressable>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Craft Category</Text>
        <TextInput style={styles.input} value={category} onChangeText={setCategory} placeholder="e.g. Pottery, Woodwork, Brass" />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Product Description (NLP Inputs)</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={description}
          onChangeText={setDescription}
          placeholder="e.g. Hand-carved teakwood box with intricate brass inlay work, polished finish..."
          multiline
        />
      </View>

      <View style={styles.row}>
        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={styles.label}>Material Cost (₹)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={materialCost}
            onChangeText={setMaterialCost}
            placeholder="e.g. 450"
          />
        </View>

        <View style={[styles.formGroup, { flex: 1 }]}>
          <Text style={styles.label}>Experience (Years)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={experienceYears}
            onChangeText={setExperienceYears}
            placeholder="e.g. 5"
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Artisan Region / State</Text>
        <TextInput style={styles.input} value={region} onChangeText={setRegion} placeholder="e.g. Rajasthan, Gujarat" />
      </View>

      <Pressable
        style={[styles.estimateBtn, estimatePrice.isPending && styles.disabledBtn]}
        onPress={() => estimatePrice.mutate()}
        disabled={estimatePrice.isPending}
      >
        {estimatePrice.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.estimateBtnText}>Calculate NLP AI Estimate</Text>
        )}
      </Pressable>

      {result && (
        <View style={styles.resultBox}>
          <Text style={styles.resultBadge}>Engine: {result.engine.toUpperCase()}</Text>
          <Text style={styles.resultTitle}>Suggested B2B Wholesale Price</Text>
          <Text style={styles.priceHighlight}>₹{result.price}</Text>

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Market Range:</Text>
            <Text style={styles.metaVal}>₹{result.marketMin} – ₹{result.marketMax}</Text>
          </View>

          {result.materialCost != null && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Material Cost Context:</Text>
              <Text style={styles.metaVal}>₹{result.materialCost}</Text>
            </View>
          )}

          <View style={styles.rationaleBox}>
            <Text style={styles.rationaleTitle}>AI Rationale (English):</Text>
            <Text style={styles.rationaleText}>{result.rationaleEn}</Text>

            <Text style={[styles.rationaleTitle, { marginTop: 8 }]}>AI Rationale (Devanagari):</Text>
            <Text style={styles.rationaleText}>{result.rationaleHi}</Text>
          </View>

          {onApplyPrice && (
            <Pressable
              style={styles.applyBtn}
              onPress={() => onApplyPrice(result.price, result.marketMin, result.marketMax)}
            >
              <Text style={styles.applyBtnText}>Apply Suggested Price (₹{result.price})</Text>
            </Pressable>
          )}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14, backgroundColor: "#fff" },
  cardHeader: { gap: 4 },
  heading: { fontSize: 20, fontWeight: "800", color: "#111827" },
  subheading: { fontSize: 13, color: "#4b5563", lineHeight: 18 },
  voiceButton: {
    backgroundColor: "#7c3aed",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  voiceButtonActive: { backgroundColor: "#dc2626" },
  voiceButtonText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  formGroup: { gap: 6 },
  label: { fontSize: 12, fontWeight: "600", color: "#374151" },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },
  multiline: { minHeight: 70, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 12 },
  estimateBtn: {
    backgroundColor: "#111827",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  disabledBtn: { opacity: 0.6 },
  estimateBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  resultBox: {
    marginTop: 12,
    backgroundColor: "#f5f3ff",
    borderWidth: 1,
    borderColor: "#ddd6fe",
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  resultBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#7c3aed",
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  resultTitle: { fontSize: 13, color: "#4c1d95", fontWeight: "600" },
  priceHighlight: { fontSize: 32, fontWeight: "800", color: "#6d28d9" },
  metaRow: { flexDirection: "row", justifyContent: "space-between" },
  metaLabel: { fontSize: 13, color: "#5b21b6" },
  metaVal: { fontSize: 13, fontWeight: "700", color: "#4c1d95" },
  rationaleBox: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#ede9fe",
  },
  rationaleTitle: { fontSize: 11, fontWeight: "700", color: "#6d28d9" },
  rationaleText: { fontSize: 13, color: "#374151", marginTop: 2 },
  applyBtn: {
    backgroundColor: "#059669",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  applyBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
})
