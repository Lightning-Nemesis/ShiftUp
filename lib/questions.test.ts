import { describe, expect, it } from "vitest"
import { bankFor, pickNextQuestion, QUESTION_BANK } from "./questions"
import { ROLES } from "./roles"
import { QUESTION_TYPES } from "./types"

describe("question bank", () => {
  it("has unique ids, a known type, and both languages on every question", () => {
    expect(new Set(QUESTION_BANK.map((q) => q.id)).size).toBe(QUESTION_BANK.length)
    for (const q of QUESTION_BANK) {
      expect(QUESTION_TYPES).toContain(q.type)
      expect(q.textEn.length).toBeGreaterThan(10)
      expect(q.textEs.length).toBeGreaterThan(10)
    }
  })

  it("covers every question type", () => {
    for (const type of QUESTION_TYPES) {
      expect(QUESTION_BANK.some((q) => q.type === type)).toBe(true)
    }
  })
})

describe("pickNextQuestion", () => {
  it("starts with the first bank question when there are no weak spots", () => {
    expect(pickNextQuestion([], []).id).toBe(QUESTION_BANK[0].id)
  })

  it("asks a weak-spot type first", () => {
    expect(pickNextQuestion(["conflict"], []).type).toBe("conflict")
  })

  it("ignores weak spots that are not question types", () => {
    expect(pickNextQuestion(["long pauses"], []).id).toBe(QUESTION_BANK[0].id)
  })

  it("does not repeat a question until the bank is used up, then starts again", () => {
    const asked: string[] = []
    for (let i = 0; i < QUESTION_BANK.length; i++) {
      const q = pickNextQuestion(["conflict"], asked)
      expect(asked).not.toContain(q.id)
      asked.push(q.id)
    }
    expect(pickNextQuestion(["conflict"], asked).type).toBe("conflict")
  })
})

describe("the question bank of every job", () => {
  it.each(Object.entries(ROLES))("%s: a known type, both languages and a hint on every question", (_id, role) => {
    expect(role.questions.length).toBeGreaterThanOrEqual(8)
    for (const q of role.questions) {
      expect(QUESTION_TYPES).toContain(q.type)
      for (const text of [q.textEn, q.textEs, q.askingEn, q.askingEs]) expect(text?.length).toBeGreaterThan(10)
    }
  })

  // The demo history marks disagreements as hard, and a session opens with "why this job".
  it.each(Object.entries(ROLES))("%s: has a question about disagreements and one about wanting the job", (_id, role) => {
    expect(role.questions.some((q) => q.type === "conflict")).toBe(true)
    expect(role.questions.some((q) => q.type === "why_this_job")).toBe(true)
  })

  it("never reuses an id across jobs", () => {
    const ids = Object.values(ROLES).flatMap((role) => role.questions.map((q) => q.id))
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe("bankFor", () => {
  it("gives each job its own questions", () => {
    expect(bankFor("retail_associate")).toBe(ROLES.retail_associate.questions)
    expect(bankFor("warehouse_associate")[0].id).toBe("wh_why_01")
  })

  it("falls back to home health aide for a job it does not know", () => {
    expect(bankFor("astronaut")).toBe(QUESTION_BANK)
    expect(bankFor(undefined)).toBe(QUESTION_BANK)
  })
})
