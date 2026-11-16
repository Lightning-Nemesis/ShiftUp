import hha from "../data/questions.hha.json"
import retail from "../data/questions.retail.json"
import warehouse from "../data/questions.warehouse.json"
import type { Question } from "./types"

// The jobs a learner can practise for. Each has its own question bank. `job`
// tells the interviewer, the feedback writer and the coach which interview this is.
export const ROLES = {
  home_health_aide: { job: "home health aide at a home care agency", questions: hha as Question[] },
  retail_associate: { job: "sales associate at a retail store", questions: retail as Question[] },
  warehouse_associate: { job: "warehouse associate at a warehouse", questions: warehouse as Question[] },
}
export type RoleId = keyof typeof ROLES

/** An unknown role falls back to the first one, so a setup saved before there were several still works. */
export const roleFor = (id: string | undefined) => ROLES[id as RoleId] ?? ROLES.home_health_aide
