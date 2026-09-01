import * as React from "react"
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { useMutation } from "@tanstack/react-query"
import { router } from "expo-router"

import { apiFetch } from "@/lib/api-client"

type OrderModalProps = {
  visible: boolean
  onClose: () => void
  businessId: string
  productId: string
  productTitle: string
  unitPrice?: number
}

export function OrderModal({
  visible,
  onClose,
  businessId,
  productId,
  productTitle,
  unitPrice = 500,
}: OrderModalProps) {
  const [quantity, setQuantity] = React.useState("10")
  const [notes, setNotes] = React.useState("")

  const qty = Math.max(1, Number(quantity) || 1)
  const estimatedTotal = qty * unitPrice

  const placeOrder = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/inquiries", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          businessId,
          productId,
          quantity: qty,
          targetPrice: unitPrice,
          message: `ORDER REQUEST: ${qty} units of "${productTitle}". Notes: ${notes.trim() || "None"}`,
        }),
      })
      if (!res.ok) throw new Error("Order creation failed")
      return (await res.json()).inquiry
    },
    onSuccess: (inquiry) => {
      onClose()
      router.push(`/(tabs)/chat/${inquiry.id}`)
    },
  })

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>📦 Place B2B Order Request</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.closeBtn}>✕</Text>
            </Pressable>
          </View>

          <Text style={styles.productName}>{productTitle}</Text>
          <Text style={styles.unitPrice}>Estimated Unit Price: ₹{unitPrice}</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Quantity (Units)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={quantity}
              onChangeText={setQuantity}
              placeholder="e.g. 10"
            />
          </View>

          <View style={styles.presetRow}>
            {[5, 10, 25, 50, 100].map((preset) => (
              <Pressable
                key={preset}
                style={[styles.presetChip, qty === preset && styles.presetChipActive]}
                onPress={() => setQuantity(String(preset))}
              >
                <Text style={qty === preset ? styles.presetTextActive : styles.presetText}>
                  {preset} units
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Delivery / Customization Notes</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Specify custom colors, packaging, target delivery date..."
              multiline
            />
          </View>

          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Estimated Total Order Value:</Text>
            <Text style={styles.summaryValue}>₹{estimatedTotal.toLocaleString()}</Text>
          </View>

          <Pressable
            style={[styles.submitBtn, placeOrder.isPending && styles.disabledBtn]}
            onPress={() => placeOrder.mutate()}
            disabled={placeOrder.isPending}
          >
            {placeOrder.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Order Request & Open Chat</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  content: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 12,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 18, fontWeight: "800", color: "#111827" },
  closeBtn: { fontSize: 20, color: "#6b7280", padding: 4 },
  productName: { fontSize: 15, fontWeight: "700", color: "#374151" },
  unitPrice: { fontSize: 13, color: "#6d28d9", fontWeight: "600" },
  field: { gap: 4 },
  label: { fontSize: 12, fontWeight: "600", color: "#4b5563" },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  multiline: { minHeight: 60, textAlignVertical: "top" },
  presetRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  presetChipActive: { backgroundColor: "#7c3aed", borderColor: "#7c3aed" },
  presetText: { fontSize: 12, color: "#374151" },
  presetTextActive: { fontSize: 12, color: "#fff", fontWeight: "700" },
  summaryBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f5f3ff",
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  summaryLabel: { fontSize: 13, fontWeight: "600", color: "#5b21b6" },
  summaryValue: { fontSize: 20, fontWeight: "800", color: "#6d28d9" },
  submitBtn: {
    backgroundColor: "#111827",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 6,
  },
  disabledBtn: { opacity: 0.5 },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
})
