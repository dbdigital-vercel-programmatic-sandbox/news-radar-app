import { NextResponse } from "next/server"

import { createUser } from "@/lib/game"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const username = String(body?.username ?? "")
    const user = await createUser(username)

    return NextResponse.json({ user })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to create user"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
