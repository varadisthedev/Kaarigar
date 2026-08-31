import { NextResponse } from "next/server"
import { features } from "@/config/env"

export async function GET() {
  return NextResponse.json({ hasServerSpeech: features.sarvam || features.mlService })
}
