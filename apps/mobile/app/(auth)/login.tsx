import * as React from "react"
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform } from "react-native"
import { router } from "expo-router"

import { useAuth } from "@/lib/auth-context"

const DIAL_CODE = "+91"
const COUNTRY_CODE = "IN"

export default function LoginScreen() {
  const { requestOtp, verifyOtp } = useAuth()
  const [step, setStep] = React.useState<"phone" | "otp">("phone")
  const [phone, setPhone] = React.useState("")
  const [code, setCode] = React.useState("")
  const [devCode, setDevCode] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  const phoneE164 = `${DIAL_CODE}${phone.replace(/\D/g, "")}`

  async function sendOtp() {
    setError(null)
    setPending(true)
    try {
      const res = await requestOtp(phoneE164)
      if (!res.ok) {
        setError(res.error === "rate_limited" ? "Too many attempts, try again later." : "Invalid phone number or SMS send failed.")
        return
      }
      setDevCode(res.devCode ?? null)
      if (res.devCode) {
        setCode(res.devCode)
      } else {
        setCode("")
      }
      setStep("otp")
    } finally {
      setPending(false)
    }
  }

  async function submitOtp() {
    setError(null)
    setPending(true)
    try {
      const res = await verifyOtp({ phoneE164, countryCode: COUNTRY_CODE, code })
      if (!res.ok) {
        setError("Incorrect or expired verification code.")
        return
      }
      router.replace("/(tabs)")
    } finally {
      setPending(false)
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.container}>
      <Text style={styles.title}>Kaarigar</Text>
      <Text style={styles.subtitle}>
        {step === "phone"
          ? "Enter your phone number to receive an SMS verification code"
          : `Enter the 6-digit verification code sent via SMS to ${phoneE164}`}
      </Text>

      {step === "phone" ? (
        <>
          <View style={styles.phoneRow}>
            <Text style={styles.dialCode}>{DIAL_CODE}</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              placeholder="98765 43210"
              value={phone}
              onChangeText={(t) => setPhone(t.replace(/\D/g, ""))}
              maxLength={10}
            />
          </View>
          {error && <Text style={styles.error}>{error}</Text>}
          <Pressable style={styles.button} onPress={sendOtp} disabled={pending || phone.length < 10}>
            {pending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send Verification SMS</Text>}
          </Pressable>
        </>
      ) : (
        <>
          {devCode && (
            <View style={styles.devCodeBadge}>
              <Text style={styles.devCodeText}>Console Dev Code: {devCode}</Text>
            </View>
          )}

          <TextInput
            style={[styles.input, styles.otpInput]}
            keyboardType="number-pad"
            placeholder="• • • • • •"
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, ""))}
            maxLength={6}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable style={styles.button} onPress={submitOtp} disabled={pending || code.length !== 6}>
            {pending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify & Continue</Text>}
          </Pressable>

          <Pressable onPress={() => setStep("phone")}>
            <Text style={styles.link}>Change phone number</Text>
          </Pressable>
        </>
      )}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", paddingHorizontal: 24, gap: 14, backgroundColor: "#fff" },
  title: { fontSize: 32, fontWeight: "800", textAlign: "center", color: "#111827", letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: "#4b5563", textAlign: "center", marginBottom: 16, lineHeight: 20 },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dialCode: { fontSize: 16, fontWeight: "600", color: "#374151", backgroundColor: "#f3f4f6", paddingHorizontal: 12, paddingVertical: 12, borderRadius: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, backgroundColor: "#fff", color: "#111827" },
  otpInput: { flex: undefined, letterSpacing: 8, textAlign: "center", fontSize: 22, fontWeight: "700" },
  button: { backgroundColor: "#111827", borderRadius: 8, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  devCodeBadge: { backgroundColor: "#e0f2fe", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, alignItems: "center" },
  devCodeText: { color: "#0369a1", fontWeight: "700", fontSize: 14 },
  error: { color: "#dc2626", fontSize: 13, textAlign: "center" },
  link: { textAlign: "center", color: "#6b7280", marginTop: 12, textDecorationLine: "underline" },
})
