import * as React from "react"
import { StyleSheet } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { NLPPriceEstimator } from "@/components/NLPPriceEstimator"

export default function PricingScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <NLPPriceEstimator />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
})
