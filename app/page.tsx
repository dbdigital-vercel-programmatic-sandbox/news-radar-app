"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type StoredUser = {
  id: string
  username: string
}

type HomeData = {
  challenge: { id: string } | null
  alreadyPlayed: boolean
  streak: number
}

const userStorageKey = "news-radar-user"

export default function HomePage() {
  const router = useRouter()
  const [usernameInput, setUsernameInput] = useState("")
  const [user, setUser] = useState<StoredUser | null>(null)
  const [homeData, setHomeData] = useState<HomeData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const raw = window.localStorage.getItem(userStorageKey)
    if (!raw) return

    try {
      const parsed = JSON.parse(raw) as StoredUser
      if (parsed?.id && parsed?.username) {
        setUser(parsed)
      }
    } catch {
      window.localStorage.removeItem(userStorageKey)
    }
  }, [])

  useEffect(() => {
    async function loadStatus() {
      const params = user ? `?userId=${encodeURIComponent(user.id)}` : ""
      const res = await fetch(`/api/challenge/today${params}`, {
        cache: "no-store",
      })
      const data = (await res.json()) as HomeData
      setHomeData(data)
    }

    loadStatus().catch(() => {
      setError("Could not load today's challenge")
    })
  }, [user])

  const statusLabel = useMemo(() => {
    if (!homeData?.challenge) return "No challenge published yet"
    if (!user) return "Sign in with a username to play"
    if (homeData.alreadyPlayed) return "You already played today"
    return "Ready to play today's challenge"
  }, [homeData, user])

  async function handlePlay() {
    setError(null)

    if (user) {
      router.push("/game")
      return
    }

    const username = usernameInput.trim()
    if (!username) {
      setError("Enter a username to start")
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      })
      const data = (await res.json()) as { user?: StoredUser; error?: string }
      if (!res.ok || !data.user) {
        throw new Error(data.error ?? "Unable to create user")
      }

      window.localStorage.setItem(userStorageKey, JSON.stringify(data.user))
      setUser(data.user)
      router.push("/game")
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to start the game"
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top,#e7f3ff_0%,#f8fbff_40%,#fefefe_100%)] p-4 sm:p-6">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4 pt-4">
        <Card className="border-sky-200/60 shadow-md shadow-sky-100/70">
          <CardHeader className="gap-3">
            <Badge className="w-fit bg-sky-600 text-white">
              Daily DAU Booster
            </Badge>
            <CardTitle className="text-2xl sm:text-3xl">
              News Radar Challenge
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Pick the headline that is trending the most right now. One shot
              per day.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {user ? (
              <div className="rounded-lg border border-sky-100 bg-sky-50/70 p-3 text-sm">
                Signed in as{" "}
                <span className="font-semibold">{user.username}</span>
              </div>
            ) : (
              <Input
                value={usernameInput}
                onChange={(event) => setUsernameInput(event.target.value)}
                placeholder="Choose a username"
                maxLength={32}
              />
            )}

            <div className="rounded-lg border border-amber-200/80 bg-amber-50/80 p-3 text-sm text-amber-900">
              {statusLabel}
              {homeData?.streak ? (
                <span className="ml-2 font-semibold">
                  Streak: {homeData.streak} days
                </span>
              ) : null}
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                size="lg"
                className="w-full bg-sky-600 text-white hover:bg-sky-700"
                onClick={handlePlay}
                disabled={isLoading}
              >
                {isLoading ? "Starting..." : "Play Today's Challenge"}
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full">
                <Link href="/leaderboard">View Leaderboard</Link>
              </Button>
            </div>

            <Button asChild variant="ghost" className="w-full">
              <Link href="/admin">Editor Admin Panel</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
