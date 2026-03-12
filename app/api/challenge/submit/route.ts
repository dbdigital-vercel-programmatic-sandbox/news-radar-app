import { NextResponse } from "next/server"

import { submitAnswer } from "@/lib/game"

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const result = await submitAnswer({
      userId: String(body?.userId ?? ""),
      challengeId: String(body?.challengeId ?? ""),
      selectedOption: body?.selectedOption
        ? String(body.selectedOption)
        : undefined,
      timeTaken: Number(body?.timeTaken ?? 15),
    })

    return NextResponse.json(result)
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to submit challenge answer"

    const status = message.includes("already played") ? 409 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
