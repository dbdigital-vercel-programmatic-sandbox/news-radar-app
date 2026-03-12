import { NextResponse } from "next/server"

import { createDailyChallenge } from "@/lib/game"

const validOptions = new Set(["A", "B", "C", "D", "E"])

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const correctOption = String(body?.correctOption ?? "").toUpperCase()
    if (!validOptions.has(correctOption)) {
      throw new Error("Correct option must be one of A, B, C, D, E")
    }

    await createDailyChallenge({
      date: String(body?.date ?? ""),
      headlineA: String(body?.headlineA ?? ""),
      headlineB: String(body?.headlineB ?? ""),
      headlineC: String(body?.headlineC ?? ""),
      headlineD: String(body?.headlineD ?? ""),
      headlineE: String(body?.headlineE ?? ""),
      correctOption: correctOption as "A" | "B" | "C" | "D" | "E",
      explanation: String(body?.explanation ?? ""),
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to create daily challenge"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
