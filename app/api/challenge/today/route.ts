import { NextResponse } from "next/server"

import { getTodayChallenge } from "@/lib/game"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId") ?? undefined

    const data = await getTodayChallenge(userId)
    return NextResponse.json(data)
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load challenge"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
