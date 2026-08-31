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
        setError(res.error === "rate_limited" ? "Too many attempts, try again later." : "Invalid phone number.")
        return
      }
      setDevCode(res.devCode ?? null)
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
        setError("Incorrect or expired code.")
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
      <Text style={styles.subtitle}>{step === "phone" ? "Log in with your phone number" : `Enter the code sent to ${phoneE164}`}</Text>

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
            {pending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send code</Text>}
          </Pressable>
        </>
      ) : (
        <>
          {devCode && <Text style={styles.devCode}>Dev code: {devCode}</Text>}
          <TextInput
            style={[styles.input, styles.otpInput]}
            keyboardType="number-pad"
            placeholder="123456"
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, ""))}
            maxLength={6}
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <Pressable style={styles.button} onPress={submitOtp} disabled={pending || code.length !== 6}>
            {pending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify</Text>}
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
  container: { flex: 1, justifyContent: "center", paddingHorizontal: 24, gap: 12, backgroundColor: "#fff" },
  title: { fontSize: 28, fontWeight: "700", textAlign: "center", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#666", textAlign: "center", marginBottom: 16 },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dialCode: { fontSize: 16, fontWeight: "600" },
  input: { flex: 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  otpInput: { flex: undefined, letterSpacing: 6, textAlign: "center" },
  button: { backgroundColor: "#111", borderRadius: 8, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  error: { color: "#c0362c", fontSize: 13 },
  devCode: { fontSize: 13, color: "#666", textAlign: "center" },
  link: { textAlign: "center", color: "#555", marginTop: 8, textDecorationLine: "underline" },
})
