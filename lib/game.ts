import { randomUUID } from "node:crypto"

import { getSql } from "@/lib/db"

export type HeadlineOption = "A" | "B" | "C" | "D" | "E"

const validOptions = new Set<HeadlineOption>(["A", "B", "C", "D", "E"])

export type DailyChallenge = {
  id: string
  date: string
  headlineA: string
  headlineB: string
  headlineC: string
  headlineD: string
  headlineE: string
  correctOption: HeadlineOption
  explanation: string | null
}

type ChallengeRow = {
  id: string
  date: string
  headline_a: string
  headline_b: string
  headline_c: string
  headline_d: string
  headline_e: string
  correct_option: HeadlineOption
  explanation: string | null
}

type AttemptRow = {
  id: string
  score: number
  time_taken: number
  selected_option: string | null
  created_at: string
}

type LeaderboardRow = {
  username: string
  score?: number
  total_score?: number
}

let schemaReady = false

export async function ensureSchema() {
  if (schemaReady) return

  const sql = getSql()

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      username TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT now()
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS daily_challenges (
      id UUID PRIMARY KEY,
      date DATE UNIQUE NOT NULL,
      headline_a TEXT NOT NULL,
      headline_b TEXT NOT NULL,
      headline_c TEXT NOT NULL,
      headline_d TEXT NOT NULL,
      headline_e TEXT NOT NULL,
      correct_option CHAR(1) NOT NULL CHECK (correct_option IN ('A', 'B', 'C', 'D', 'E')),
      explanation TEXT
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS attempts (
      id UUID PRIMARY KEY,
      user_id UUID REFERENCES users(id),
      challenge_id UUID REFERENCES daily_challenges(id),
      selected_option CHAR(1) CHECK (selected_option IN ('A', 'B', 'C', 'D', 'E') OR selected_option IS NULL),
      score INTEGER NOT NULL,
      time_taken INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT now(),
      UNIQUE (user_id, challenge_id)
    )
  `

  await sql`
    CREATE INDEX IF NOT EXISTS attempts_created_at_idx
    ON attempts (created_at DESC)
  `

  schemaReady = true
}

function mapChallenge(row: ChallengeRow): DailyChallenge {
  return {
    id: row.id,
    date: row.date,
    headlineA: row.headline_a,
    headlineB: row.headline_b,
    headlineC: row.headline_c,
    headlineD: row.headline_d,
    headlineE: row.headline_e,
    correctOption: row.correct_option,
    explanation: row.explanation,
  }
}

export function calculateScore({
  isCorrect,
  timeTaken,
}: {
  isCorrect: boolean
  timeTaken: number
}) {
  const basePoints = 100
  const clampedTimeTaken = Math.max(0, Math.min(15, Math.floor(timeTaken)))
  const remainingSeconds = 15 - clampedTimeTaken

  if (!isCorrect) {
    return 0
  }

  return basePoints + remainingSeconds * 5
}

export async function createUser(username: string) {
  await ensureSchema()
  const sql = getSql()

  const normalized = username.trim().slice(0, 32)
  if (!normalized) {
    throw new Error("Username is required")
  }

  const existing = (await sql`
    SELECT id, username
    FROM users
    WHERE lower(username) = lower(${normalized})
    ORDER BY created_at ASC
    LIMIT 1
  `) as { id: string; username: string }[]

  if (existing.length > 0) {
    return existing[0]
  }

  const id = randomUUID()
  await sql`
    INSERT INTO users (id, username)
    VALUES (${id}, ${normalized})
  `

  return { id, username: normalized }
}

export async function createDailyChallenge(input: {
  date: string
  headlineA: string
  headlineB: string
  headlineC: string
  headlineD: string
  headlineE: string
  correctOption: HeadlineOption
  explanation?: string
}) {
  await ensureSchema()
  const sql = getSql()

  const safeDate = input.date.trim()
  if (!safeDate) {
    throw new Error("Challenge date is required")
  }

  const headlines = [
    input.headlineA,
    input.headlineB,
    input.headlineC,
    input.headlineD,
    input.headlineE,
  ].map((headline) => headline.trim())

  if (headlines.some((headline) => !headline)) {
    throw new Error("All five headlines are required")
  }

  if (!validOptions.has(input.correctOption)) {
    throw new Error("Correct option must be one of A, B, C, D, E")
  }

  const id = randomUUID()
  const explanation = input.explanation?.trim() || null

  await sql`
    INSERT INTO daily_challenges (
      id,
      date,
      headline_a,
      headline_b,
      headline_c,
      headline_d,
      headline_e,
      correct_option,
      explanation
    )
    VALUES (
      ${id},
      ${safeDate},
      ${headlines[0]},
      ${headlines[1]},
      ${headlines[2]},
      ${headlines[3]},
      ${headlines[4]},
      ${input.correctOption},
      ${explanation}
    )
    ON CONFLICT (date)
    DO UPDATE SET
      headline_a = EXCLUDED.headline_a,
      headline_b = EXCLUDED.headline_b,
      headline_c = EXCLUDED.headline_c,
      headline_d = EXCLUDED.headline_d,
      headline_e = EXCLUDED.headline_e,
      correct_option = EXCLUDED.correct_option,
      explanation = EXCLUDED.explanation
  `
}

export async function getTodayChallenge(userId?: string) {
  await ensureSchema()
  const sql = getSql()

  const [challenge] = (await sql`
    SELECT *
    FROM daily_challenges
    WHERE date = CURRENT_DATE
    LIMIT 1
  `) as ChallengeRow[]

  if (!challenge) {
    return {
      challenge: null,
      alreadyPlayed: false,
      streak: 0,
    }
  }

  if (!userId) {
    return {
      challenge: mapChallenge(challenge),
      alreadyPlayed: false,
      streak: 0,
    }
  }

  const [attempt] = (await sql`
    SELECT id, score, time_taken, selected_option, created_at
    FROM attempts
    WHERE user_id = ${userId} AND challenge_id = ${challenge.id}
    LIMIT 1
  `) as AttemptRow[]

  return {
    challenge: mapChallenge(challenge),
    alreadyPlayed: Boolean(attempt),
    streak: await getUserStreak(userId),
    attempt: attempt
      ? {
          score: attempt.score,
          timeTaken: attempt.time_taken,
          selectedOption: attempt.selected_option,
        }
      : null,
  }
}

export async function submitAnswer(input: {
  userId: string
  challengeId: string
  selectedOption?: string
  timeTaken: number
}) {
  await ensureSchema()
  const sql = getSql()

  if (!input.userId || !input.challengeId) {
    throw new Error("Missing user or challenge")
  }

  const [challenge] = (await sql`
    SELECT *
    FROM daily_challenges
    WHERE id = ${input.challengeId} AND date = CURRENT_DATE
    LIMIT 1
  `) as ChallengeRow[]

  if (!challenge) {
    throw new Error("Today's challenge is not available")
  }

  const [existing] = (await sql`
    SELECT id, score
    FROM attempts
    WHERE user_id = ${input.userId} AND challenge_id = ${input.challengeId}
    LIMIT 1
  `) as { id: string; score: number }[]

  if (existing) {
    throw new Error("You already played today's challenge")
  }

  const selectedOption = (input.selectedOption?.toUpperCase() ?? "").slice(0, 1)
  if (selectedOption && !validOptions.has(selectedOption as HeadlineOption)) {
    throw new Error("Selected option must be A, B, C, D, E")
  }
  const isCorrect = selectedOption === challenge.correct_option
  const score = calculateScore({ isCorrect, timeTaken: input.timeTaken })

  await sql`
    INSERT INTO attempts (
      id,
      user_id,
      challenge_id,
      selected_option,
      score,
      time_taken
    )
    VALUES (
      ${randomUUID()},
      ${input.userId},
      ${input.challengeId},
      ${selectedOption || null},
      ${score},
      ${Math.max(0, Math.min(15, Math.floor(input.timeTaken)))}
    )
  `

  return {
    isCorrect,
    score,
    correctOption: challenge.correct_option,
    explanation: challenge.explanation,
  }
}

export async function getTodayLeaderboard(limit = 20) {
  await ensureSchema()
  const sql = getSql()

  const safeLimit = Math.max(1, Math.min(50, Math.floor(limit)))

  const rows = (await sql`
    SELECT users.username, attempts.score
    FROM attempts
    JOIN users ON users.id = attempts.user_id
    JOIN daily_challenges ON attempts.challenge_id = daily_challenges.id
    WHERE daily_challenges.date = CURRENT_DATE
    ORDER BY attempts.score DESC
    LIMIT ${safeLimit}
  `) as LeaderboardRow[]

  return rows.map((row, index) => ({
    rank: index + 1,
    username: row.username,
    score: row.score ?? 0,
  }))
}

export async function getWeeklyLeaderboard(limit = 20) {
  await ensureSchema()
  const sql = getSql()

  const safeLimit = Math.max(1, Math.min(50, Math.floor(limit)))

  const rows = (await sql`
    SELECT users.username, SUM(attempts.score) as total_score
    FROM attempts
    JOIN users ON users.id = attempts.user_id
    WHERE attempts.created_at > NOW() - INTERVAL '7 days'
    GROUP BY users.username
    ORDER BY total_score DESC
    LIMIT ${safeLimit}
  `) as LeaderboardRow[]

  return rows.map((row, index) => ({
    rank: index + 1,
    username: row.username,
    score: Number(row.total_score ?? 0),
  }))
}

export async function getUserStreak(userId: string) {
  await ensureSchema()
  const sql = getSql()

  const rows = (await sql`
    SELECT DISTINCT DATE(created_at) AS day
    FROM attempts
    WHERE user_id = ${userId}
    ORDER BY day DESC
    LIMIT 30
  `) as { day: string }[]

  const playedDays = new Set(rows.map((row) => row.day))
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)

  let streak = 0
  for (let i = 0; i < 30; i += 1) {
    const key = cursor.toISOString().slice(0, 10)
    if (!playedDays.has(key)) {
      break
    }
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
}
