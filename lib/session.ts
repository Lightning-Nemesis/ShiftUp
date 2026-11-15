import { pickNextQuestion } from "./questions"
import type { Profile, Question } from "./types"

// Interview sessions live in server memory: enough for a demo on one machine.
export type Session = {
  id: string
  learnerId: string
  /** The name the learner typed, used when writing memories about them. */
  name: string
  role: string
  jobPosting?: string
  /** Her resume as pasted text. Kept for this session only: it is never written to memory. */
  resume?: string
  /** The profile as read at session start, updated as the learner tells new stories. */
  profile: Profile
  asked: Question[]
}

// Survives hot reloads in development.
const store = ((globalThis as { __sessions?: Map<string, Session> }).__sessions ??= new Map<string, Session>())

export function createSession(input: Omit<Session, "id" | "asked">): Session {
  const id = `s_${new Date().toLocaleDateString("en-CA")}_${Math.random().toString(36).slice(2, 8)}`
  const session: Session = { ...input, id, asked: [] }
  store.set(id, session)
  return session
}

export const getSession = (id: string) => store.get(id)

export function nextQuestion(session: Session): Question {
  const question = pickNextQuestion(session.profile.weakSpots, session.asked.map((q) => q.id))
  session.asked.push(question)
  return question
}

export const findAsked = (session: Session, questionId: string) => session.asked.find((q) => q.id === questionId)
