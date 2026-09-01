import * as React from "react"
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { router } from "expo-router"

import { useAuth } from "@/lib/auth-context"

const DIAL_CODE = "+91"
const COUNTRY_CODE = "IN"

export default function LoginScreen() {
  const { requestOtp, verifyOtp, loginWithGoogle } = useAuth()
  const [step, setStep] = React.useState<"phone" | "otp">("phone")
  const [phone, setPhone] = React.useState("")
  const [code, setCode] = React.useState("")
  const [devCode, setDevCode] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)
  const [googlePending, setGooglePending] = React.useState(false)

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
      setCode(res.devCode ?? "")
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

  async function handleGoogleLogin() {
    setError(null)
    setGooglePending(true)
    try {
      const res = await loginWithGoogle()
      if (!res.ok) {
        if (res.error !== "google_login_cancelled") {
          setError("Google sign-in failed. Please try again.")
        }
        return
      }
      router.replace("/(tabs)")
    } finally {
      setGooglePending(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      {/* Brand header */}
      <View style={styles.brandWrap}>
        <Text style={styles.brandEmoji}>🧵</Text>
        <Text style={styles.title}>Kaarigar</Text>
        <Text style={styles.tagline}>B2B Handcraft Marketplace</Text>
      </View>

      {step === "phone" ? (
        <>
          <Text style={styles.sectionLabel}>Sign in with phone</Text>

          <View style={styles.phoneRow}>
            <Text style={styles.dialCode}>{DIAL_CODE}</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              placeholder="98765 43210"
              value={phone}
              onChangeText={(t) => setPhone(t.replace(/\D/g, ""))}
              maxLength={10}
              placeholderTextColor="#9ca3af"
            />
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={[styles.button, (pending || phone.length < 10) && styles.buttonDisabled]}
            onPress={sendOtp}
            disabled={pending || phone.length < 10}
          >
            {pending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Send Verification SMS</Text>
            )}
          </Pressable>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign In */}
          <Pressable
            style={[styles.googleButton, googlePending && styles.buttonDisabled]}
            onPress={handleGoogleLogin}
            disabled={googlePending}
          >
            {googlePending ? (
              <ActivityIndicator color="#374151" />
            ) : (
              <View style={styles.googleButtonInner}>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </View>
            )}
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.sectionLabel}>Enter verification code</Text>
          <Text style={styles.subtitle}>Sent via SMS to {phoneE164}</Text>

          {devCode && (
            <View style={styles.devCodeBadge}>
              <Text style={styles.devCodeText}>🔧 Dev console code: {devCode}</Text>
            </View>
          )}

          <TextInput
            style={[styles.input, styles.otpInput]}
            keyboardType="number-pad"
            placeholder="• • • • • •"
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, ""))}
            maxLength={6}
            placeholderTextColor="#9ca3af"
            autoFocus
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={[styles.button, (pending || code.length !== 6) && styles.buttonDisabled]}
            onPress={submitOtp}
            disabled={pending || code.length !== 6}
          >
            {pending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verify & Continue</Text>
            )}
          </Pressable>

          <Pressable onPress={() => { setStep("phone"); setError(null) }}>
            <Text style={styles.link}>← Change phone number</Text>
          </Pressable>
        </>
      )}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 12,
    backgroundColor: "#fff",
  },
  brandWrap: {
    alignItems: "center",
    marginBottom: 12,
    gap: 4,
  },
  brandEmoji: { fontSize: 40 },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
  },
  subtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: -6,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dialCode: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    color: "#111827",
  },
  otpInput: {
    flex: undefined,
    width: "100%",
    letterSpacing: 12,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "800",
  },
  button: {
    backgroundColor: "#111827",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e5e7eb",
  },
  dividerText: {
    color: "#9ca3af",
    fontSize: 13,
  },
  googleButton: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#d1d5db",
  },
  googleButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: "800",
    color: "#4285F4",
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
  },
  devCodeBadge: {
    backgroundColor: "#e0f2fe",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  devCodeText: { color: "#0369a1", fontWeight: "700", fontSize: 13 },
  error: {
    color: "#dc2626",
    fontSize: 13,
    textAlign: "center",
    backgroundColor: "#fef2f2",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  link: {
    textAlign: "center",
    color: "#6b7280",
    marginTop: 8,
    fontSize: 14,
    textDecorationLine: "underline",
  },
})
