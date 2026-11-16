import demo from "@/data/seed/demo.json"
import { seedProfile } from "@/lib/memory"
import { setLog } from "@/lib/sessionLog"

// Loads the demo history (stories, weak spots and two earlier sessions) for the
// learner named in the request, for the job they chose. Run it well before a demo: Supermemory needs
// about half a minute to form the memories.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { learnerId?: string; name?: string; role?: string }
  const learnerId = body.learnerId || "jaciel"
  const name = body.name || "Jaciel"
  const persona = demo.roles[body.role as keyof typeof demo.roles] ?? demo.roles.home_health_aide
  const memory = await seedProfile(learnerId, persona.about.replaceAll("{name}", name), persona.profile)
  await setLog(learnerId, demo.sessions)
  return Response.json({ ok: true, learnerId, jobPosting: persona.jobPosting, memory })
}
