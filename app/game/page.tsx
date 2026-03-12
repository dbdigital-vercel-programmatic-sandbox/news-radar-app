"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type User = {
  id: string
  username: string
}

type Challenge = {
  id: string
  headlineA: string
  headlineB: string
  headlineC: string
  headlineD: string
  headlineE: string
  correctOption: "A" | "B" | "C" | "D" | "E"
  explanation: string | null
}

type Result = {
  isCorrect: boolean
  score: number
  correctOption: "A" | "B" | "C" | "D" | "E"
  explanation: string | null
}

type LeaderboardPreviewRow = {
  rank: number
  username: string
  score: number
}

const options = ["A", "B", "C", "D", "E"] as const
const userStorageKey = "news-radar-user"

export default function GamePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [alreadyPlayed, setAlreadyPlayed] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(15)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [leaderboardPreview, setLeaderboardPreview] = useState<
    LeaderboardPreviewRow[]
  >([])
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const raw = window.localStorage.getItem(userStorageKey)
    if (!raw) {
      router.replace("/")
      return
    }

    try {
      const parsed = JSON.parse(raw) as User
      if (!parsed?.id) {
        router.replace("/")
        return
      }
      setUser(parsed)
    } catch {
      router.replace("/")
    }
  }, [router])

  useEffect(() => {
    if (!user) return
    const userId = user.id

    async function loadChallenge() {
      const res = await fetch(
        `/api/challenge/today?userId=${encodeURIComponent(userId)}`,
        {
          cache: "no-store",
        }
      )
      const data = (await res.json()) as {
        challenge: Challenge | null
        alreadyPlayed: boolean
      }

      setChallenge(data.challenge)
      setAlreadyPlayed(data.alreadyPlayed)
    }

    loadChallenge().catch(() => {
      setError("Could not load today's challenge")
    })
  }, [user])

  const headlineMap = useMemo(() => {
    if (!challenge) return null
    return {
      A: challenge.headlineA,
      B: challenge.headlineB,
      C: challenge.headlineC,
      D: challenge.headlineD,
      E: challenge.headlineE,
    }
  }, [challenge])

  const onSubmit = useCallback(
    async (option?: string) => {
      if (!challenge || !user || isSubmitting || result) return

      setIsSubmitting(true)
      setSelectedOption(option ?? null)
      setError(null)

      try {
        const timeTaken = 15 - secondsLeft
        const res = await fetch("/api/challenge/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            challengeId: challenge.id,
            selectedOption: option,
            timeTaken,
          }),
        })

        const data = (await res.json()) as Result & { error?: string }
        if (!res.ok) {
          throw new Error(data.error ?? "Submission failed")
        }

        setResult(data)

        const leaderboardRes = await fetch(
          "/api/leaderboard?range=today&limit=3",
          {
            cache: "no-store",
          }
        )
        if (leaderboardRes.ok) {
          const leaderboardData = (await leaderboardRes.json()) as {
            rows?: LeaderboardPreviewRow[]
          }
          setLeaderboardPreview(leaderboardData.rows ?? [])
        }
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Submission failed"
        )
      } finally {
        setIsSubmitting(false)
      }
    },
    [challenge, isSubmitting, result, secondsLeft, user]
  )

  useEffect(() => {
    if (!challenge || alreadyPlayed || result) return
    if (secondsLeft <= 0) {
      void onSubmit(undefined)
      return
    }

    const timer = setTimeout(
      () => setSecondsLeft((current) => current - 1),
      1000
    )
    return () => clearTimeout(timer)
  }, [alreadyPlayed, challenge, onSubmit, result, secondsLeft])

  async function shareResult() {
    if (!result) return
    const text = `I scored ${result.score} in today's News Radar Challenge. Can you beat me?`

    if (navigator.share) {
      await navigator.share({ text })
      return
    }

    await navigator.clipboard.writeText(text)
  }

  if (!challenge && !error) {
    return <main className="p-6 text-sm">Loading challenge...</main>
  }

  if (error) {
    return (
      <main className="p-6">
        <Card className="mx-auto w-full max-w-xl">
          <CardContent className="pt-6 text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      </main>
    )
  }

  if (!challenge) {
    return (
      <main className="p-6">
        <Card className="mx-auto w-full max-w-xl">
          <CardHeader>
            <CardTitle>No Challenge Yet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Editors have not published today&apos;s game yet.
            </p>
            <Button asChild>
              <Link href="/">Back Home</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  if (alreadyPlayed && !result) {
    return (
      <main className="p-6">
        <Card className="mx-auto w-full max-w-xl">
          <CardHeader>
            <CardTitle>You already played today</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Come back tomorrow for a new challenge.
            </p>
            <Button asChild>
              <Link href="/leaderboard">View leaderboard</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top,#fff7e6_0%,#fffdfa_30%,#ffffff_100%)] p-4 sm:p-6">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
        <Card className="shadow-md shadow-amber-100/80">
          <CardHeader className="gap-2">
            <div className="flex items-center justify-between">
              <CardTitle>News Radar Challenge</CardTitle>
              <Badge className="bg-amber-500 text-amber-950">
                <span className={secondsLeft <= 5 ? "animate-pulse" : ""}>
                  {secondsLeft}s
                </span>
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Which headline is trending the most right now?
            </p>
          </CardHeader>

          {!result ? (
            <CardContent className="space-y-2">
              {options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => void onSubmit(option)}
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-amber-200/80 bg-white p-3 text-left text-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50 disabled:opacity-60"
                >
                  <span className="mr-2 font-semibold text-amber-800">
                    {option})
                  </span>
                  {headlineMap?.[option]}
                </button>
              ))}
            </CardContent>
          ) : (
            <CardContent className="space-y-3">
              <div className="rounded-xl border p-3 text-sm">
                <p className="font-semibold">
                  {result.isCorrect ? "Correct. Nice call." : "Not this time."}
                </p>
                <p className="mt-1">Correct answer: {result.correctOption}</p>
                <p className="mt-1 text-muted-foreground">
                  Your score: {result.score}
                </p>
                {selectedOption ? (
                  <p className="mt-1 text-muted-foreground">
                    You picked: {selectedOption}
                  </p>
                ) : null}
                {result.explanation ? (
                  <p className="mt-2 text-muted-foreground">
                    {result.explanation}
                  </p>
                ) : null}
              </div>

              <div className="rounded-xl border border-amber-200/70 bg-amber-50/60 p-3 text-sm">
                <p className="font-semibold text-amber-900">
                  Today&apos;s Top Scores
                </p>
                {leaderboardPreview.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    {leaderboardPreview.map((row) => (
                      <p
                        key={`${row.rank}-${row.username}`}
                        className="flex items-center justify-between text-muted-foreground"
                      >
                        <span>
                          #{row.rank} {row.username}
                        </span>
                        <span className="font-semibold text-foreground">
                          {row.score}
                        </span>
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-muted-foreground">
                    No scores posted yet.
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  asChild
                  className="w-full bg-amber-500 text-amber-950 hover:bg-amber-400"
                >
                  <Link href="/leaderboard">View Leaderboard</Link>
                </Button>
                <Button
                  onClick={() => void shareResult()}
                  variant="outline"
                  className="w-full"
                >
                  Share Result
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </main>
  )
}
