import { NextResponse } from "next/server"

import { getTodayLeaderboard, getWeeklyLeaderboard } from "@/lib/game"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const range = searchParams.get("range") ?? "today"
    const limit = Number(searchParams.get("limit") ?? 20)

    if (range === "weekly") {
      return NextResponse.json({
        range: "weekly",
        rows: await getWeeklyLeaderboard(limit),
      })
    }

    return NextResponse.json({
      range: "today",
      rows: await getTodayLeaderboard(limit),
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load leaderboard"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
