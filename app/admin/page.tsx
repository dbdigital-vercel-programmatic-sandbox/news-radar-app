"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

const options = ["A", "B", "C", "D", "E"] as const

type FormState = {
  date: string
  headlineA: string
  headlineB: string
  headlineC: string
  headlineD: string
  headlineE: string
  correctOption: "A" | "B" | "C" | "D" | "E"
  explanation: string
}

function todayLocalIsoDate() {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

export default function AdminPage() {
  const [form, setForm] = useState<FormState>({
    date: todayLocalIsoDate(),
    headlineA: "",
    headlineB: "",
    headlineC: "",
    headlineD: "",
    headlineE: "",
    correctOption: "A",
    explanation: "",
  })
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const isComplete = useMemo(
    () =>
      Boolean(
        form.date &&
        form.headlineA.trim() &&
        form.headlineB.trim() &&
        form.headlineC.trim() &&
        form.headlineD.trim() &&
        form.headlineE.trim()
      ),
    [form]
  )

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isComplete || isSaving) return

    setError(null)
    setSuccess(null)
    setIsSaving(true)

    try {
      const res = await fetch("/api/admin/challenge", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      })

      const data = (await res.json()) as { ok?: boolean; error?: string }

      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to save challenge")
      }

      setSuccess("Daily challenge published successfully.")
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to save challenge"
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top,#ffecc6_0%,#fff8ea_44%,#ffffff_100%)] p-4 sm:p-6">
      <div className="mx-auto w-full max-w-xl">
        <Card className="border-orange-200/80 shadow-md shadow-orange-100/70">
          <CardHeader className="gap-3">
            <Badge className="w-fit bg-orange-600 text-white">
              Editor Tools
            </Badge>
            <CardTitle className="text-2xl">Publish Daily Challenge</CardTitle>
            <p className="text-sm text-muted-foreground">
              Add five headlines, pick the correct trending option, and publish.
            </p>
          </CardHeader>

          <CardContent>
            <form className="space-y-3" onSubmit={onSubmit}>
              <Input
                type="date"
                value={form.date}
                onChange={(event) => updateField("date", event.target.value)}
                required
              />

              <Input
                value={form.headlineA}
                onChange={(event) =>
                  updateField("headlineA", event.target.value)
                }
                placeholder="Headline A"
                maxLength={180}
                required
              />
              <Input
                value={form.headlineB}
                onChange={(event) =>
                  updateField("headlineB", event.target.value)
                }
                placeholder="Headline B"
                maxLength={180}
                required
              />
              <Input
                value={form.headlineC}
                onChange={(event) =>
                  updateField("headlineC", event.target.value)
                }
                placeholder="Headline C"
                maxLength={180}
                required
              />
              <Input
                value={form.headlineD}
                onChange={(event) =>
                  updateField("headlineD", event.target.value)
                }
                placeholder="Headline D"
                maxLength={180}
                required
              />
              <Input
                value={form.headlineE}
                onChange={(event) =>
                  updateField("headlineE", event.target.value)
                }
                placeholder="Headline E"
                maxLength={180}
                required
              />

              <div className="rounded-xl border border-orange-200/80 bg-orange-50/70 p-3">
                <p className="mb-2 text-sm font-medium">Correct option</p>
                <div className="grid grid-cols-5 gap-2">
                  {options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => updateField("correctOption", option)}
                      className={`rounded-lg border p-2 text-sm font-semibold transition ${
                        form.correctOption === option
                          ? "border-orange-500 bg-orange-500 text-white"
                          : "border-orange-200 bg-white text-orange-900"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <Textarea
                value={form.explanation}
                onChange={(event) =>
                  updateField("explanation", event.target.value)
                }
                placeholder="Optional explanation shown after result"
                rows={4}
                maxLength={400}
              />

              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}
              {success ? (
                <p className="text-sm text-emerald-700">{success}</p>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="submit"
                  disabled={!isComplete || isSaving}
                  className="w-full bg-orange-600 text-white hover:bg-orange-700"
                >
                  {isSaving ? "Publishing..." : "Publish Challenge"}
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/">Back Home</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
