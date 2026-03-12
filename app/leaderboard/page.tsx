"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type LeaderboardRow = {
  rank: number
  username: string
  score: number
}

type RangeType = "today" | "weekly"

const badgesByRank: Record<number, string> = {
  1: "Top 1",
  2: "Top 2",
  3: "Top 3",
}

export default function LeaderboardPage() {
  const [range, setRange] = useState<RangeType>("today")
  const [rows, setRows] = useState<LeaderboardRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadLeaderboard() {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch(`/api/leaderboard?range=${range}&limit=20`, {
          cache: "no-store",
        })

        const data = (await res.json()) as {
          rows?: LeaderboardRow[]
          error?: string
        }

        if (!res.ok) {
          throw new Error(data.error ?? "Failed to load leaderboard")
        }

        setRows(data.rows ?? [])
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load leaderboard"
        )
      } finally {
        setLoading(false)
      }
    }

    void loadLeaderboard()
  }, [range])

  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top,#e9f8ee_0%,#f9fef9_42%,#ffffff_100%)] p-4 sm:p-6">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
        <Card className="border-emerald-200/70 shadow-md shadow-emerald-100/70">
          <CardHeader className="gap-3">
            <CardTitle className="text-2xl">Leaderboard</CardTitle>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => setRange("today")}
                className="flex-1"
                variant={range === "today" ? "default" : "outline"}
              >
                Today
              </Button>
              <Button
                type="button"
                onClick={() => setRange("weekly")}
                className="flex-1"
                variant={range === "weekly" ? "default" : "outline"}
              >
                This Week
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {range === "today"
                ? "Top players for today's challenge"
                : "Top cumulative scores over the last 7 days"}
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? <p className="text-sm">Loading leaderboard...</p> : null}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            {!loading && !error && rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No scores yet. Be the first to post one.
              </p>
            ) : null}

            {!loading && !error && rows.length > 0 ? (
              <div className="space-y-2">
                {rows.map((row) => {
                  const showTodayBadge = range === "today" && row.rank <= 10
                  const showWeekBadge = range === "weekly" && row.rank <= 3

                  return (
                    <div
                      key={`${row.rank}-${row.username}`}
                      className="flex items-center justify-between rounded-xl border border-emerald-200/70 bg-white p-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-emerald-900">
                          #{row.rank}
                        </span>
                        <span className="text-sm">{row.username}</span>
                        {badgesByRank[row.rank] ? (
                          <Badge variant="secondary">
                            {badgesByRank[row.rank]}
                          </Badge>
                        ) : null}
                        {showTodayBadge ? (
                          <Badge className="bg-emerald-600 text-white">
                            Top 10 today
                          </Badge>
                        ) : null}
                        {showWeekBadge ? (
                          <Badge className="bg-amber-500 text-amber-950">
                            Top 3 this week
                          </Badge>
                        ) : null}
                      </div>
                      <span className="font-semibold text-foreground">
                        {row.score}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : null}

            <Button asChild variant="outline" className="w-full">
              <Link href="/">Back Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
