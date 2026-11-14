# Architecture

Interview Practice in Your Language, sunhacks 2026. This is the build reference for the two builders. The product brief, demo script and task split are in `TEAM_BRIEF.md`.

## The design in one line

Polly speaks, Transcribe listens for the words, plain code measures the delivery, Gemini listens for behaviour, Claude writes the feedback, and Supermemory remembers.

## Final flow

What Maria does on the left, what the system does on the right.

| # | What Maria does | What the system does |
|---|---|---|
| 1 | Picks a role or pastes a job posting; chooses whether to answer in Spanish first | Loads her profile from Supermemory and picks the first question, starting with a past weak spot |
| 2 | Watches the face ask the question in English; can switch captions, slow it down or repeat it | Polly supplies the voice and mouth timings; the browser animates the mouth |
| 3 | Taps and answers out loud | The browser records the answer and sends it to the server |
| 4 | Waits a few seconds, seeing her transcript first | Transcribe returns words with timings; code measures pace, pauses and start delay; Gemini adds behaviour notes if it is quick enough; Claude writes the feedback |
| 5 | Reads feedback in Spanish with English alongside: one good thing, one fix, a stronger answer from her own details, and a line each on clarity, confidence and naturalness | Nothing shown is a pronunciation score or a comment on accent |
| 6 | Replays the one word to practise, slowly, watching the mouth | The same audio plays at half speed with the mouth in sync |
| 7 | Retries the answer or moves on | Her story, weak spot and numbers are saved to Supermemory and the session log |
| 8 | Hears the next question | It is picked from her weak spots, the job posting, or as a follow-up to what she just said |
| 9 | Opens the progress view at the end | It compares her only with her own earlier sessions |

At steps 2 and 5 she can tap "Preguntar al coach," ask anything in Spanish by voice or text, hear the answer in Spanish, and return to exactly where she left off. Asking never counts against her.

```
Setup -> Question -> Answer -> Feedback -> Practise word -> Next question -> ... -> Progress
            |                     |                              ^
            +---> Coach (Spanish) +                              |
                      returns to where she left          weak spots from memory
```

The next time she starts a session, step 1 opens with what she struggled with last time.

## Services

| Job | Service | Notes |
|---|---|---|
| Voice out (text to speech) and mouth timing | Amazon Polly | Polly only speaks. It cannot transcribe |
| Voice in (speech to text) | Amazon Transcribe, streaming | Returns each word with start time, end time and a confidence from 0 to 1. Same AWS credentials as Polly |
| Delivery numbers | Our own code | Pace, start delay, pauses, unclear words. No model involved |
| Behaviour observations from the recording | Gemini API (audio input) | Optional layer. Never blocks the answer. Enters the MLH Gemini prize |
| Question picking and all learner-facing feedback | Claude Opus 5.5 (`claude-opus-5-5`), low effort, structured output | One model writes everything she reads, so the tone and the Spanish stay consistent |
| Learner memory across sessions | Supermemory v5 | One namespace per learner |
| Session numbers for the progress view | Local JSON file | MongoDB Atlas instead if we want that prize |
| App | Next.js with TypeScript, one repo | Screen and API routes together |
| Hosting | Local laptop for the demo; Vercel for the Devpost link | |

How to reach Claude: use an Anthropic API key if we have one. If we only have AWS credentials, Claude is also offered through Amazon Bedrock, provided model access is enabled in our AWS account. If neither works within 20 minutes, use Gemini for the written feedback too; the route contract below does not change.

## Diagram

```
Browser (Chrome)
  Setup screen      role, pasted job posting, "answer in Spanish first"
  Interview screen  face, captions, mic, feedback panel
  Progress screen
  Records the answer as 16 kHz mono PCM
        |
        v
Next.js API routes (all keys stay on the server)
  /api/session/start   Supermemory profile -> first question
  /api/question/next   bank / posting / follow-up -> question
  /api/speak           Polly audio + mouth timing
  /api/answer          Transcribe  ---+
                       Gemini (opt) --+--> delivery code --> Claude --> response
                       then, after responding: Supermemory + session log
  /api/progress        session log
  /api/coach           Spanish side conversation: Transcribe -> Claude -> Polly
  /api/demo/seed, /api/demo/reset
        |
        v
Polly   Transcribe   Gemini   Claude   Supermemory   sessions.json
```

## One turn, step by step

1. The server reads her profile and picks a question.
2. The screen plays the question audio and moves the mouth on Polly's timings. Captions show English or Spanish.
3. Recording starts the moment the question audio ends, and stops when she taps the button.
4. The recording goes to `/api/answer`. Transcribe and Gemini run at the same time on it.
5. The delivery code turns Transcribe's word timings into numbers.
6. Claude gets the question, transcript, numbers, Gemini's observations (if they arrived) and her profile, and returns the feedback in both languages.
7. The screen shows the feedback. Only then does the server save to Supermemory and the session log.

Target: under 8 seconds from the end of her answer to feedback on screen. Show the transcript as soon as Transcribe returns, so the wait feels shorter. This target is not measured yet.

## API contract

Builder B can build against these shapes with fake data from the first hour.

### `POST /api/session/start`

```json
// request
{ "learnerId": "maria", "role": "home_health_aide", "jobPosting": "optional pasted text" }

// response
{
  "sessionId": "s_2026-11-14_01",
  "profile": { "stories": ["Calmed a client who refused her medication"], "weakSpots": ["conflict"] },
  "question": { "id": "hha_conflict_01", "type": "conflict", "source": "bank",
                "textEn": "Tell me about a time you disagreed with a coworker.",
                "textEs": "Cuénteme de una vez que no estuvo de acuerdo con un compañero de trabajo." }
}
```

### `POST /api/question/next`

```json
// request
{ "sessionId": "s_2026-11-14_01" }

// response: the same "question" object as above
```

`source` is `bank`, `posting` or `followup`. `type` is always one of the fixed list under "Questions."

### `POST /api/speak`

```json
// request
{ "text": "Tell me about a time you disagreed with a coworker.", "speed": "normal" }

// response
{
  "audioBase64": "<mp3>",
  "visemes": [{ "timeMs": 0, "value": "t" }, { "timeMs": 85, "value": "E" }],
  "words":   [{ "timeMs": 0, "value": "Tell" }, { "timeMs": 210, "value": "me" }]
}
```

`speed` is `slow`, `normal`, or `x-slow` (used for the single-word replay).

### `POST /api/answer`

Multipart form: `audio` (16 kHz, mono, signed 16-bit PCM), `sessionId`, `questionId`, `language` (`en-US` or `es-US`).

```json
// response
{
  "transcript": "I talk with her and we make a schedule for the medication.",
  "words": [{ "text": "medication", "startMs": 5120, "endMs": 5810, "confidence": 0.41 }],
  "delivery": { "paceWpm": 132, "startDelayMs": 6100, "longPauses": 2,
                "speakingMs": 21400, "unclearWords": ["medication", "schedule"] },
  "feedback": {
    "content": {
      "good": { "es": "...", "en": "..." },
      "fix":  { "es": "...", "en": "..." },
      "sampleAnswerEn": "...",
      "usedDetails": ["talked with her", "made a schedule"]
    },
    "delivery": {
      "clarity":     { "es": "...", "en": "..." },
      "confidence":  { "es": "...", "en": "..." },
      "naturalness": { "es": "...", "en": "..." },
      "practiseNext": { "kind": "word", "word": "medication", "es": "...", "en": "..." }
    }
  },
  "weakSpot": "conflict"
}
```

`practiseNext.kind` is `word`, `start`, `pace` or `phrase`. When `language` is `es-US`, the `delivery` feedback is omitted, because delivery is only assessed on English answers.

### `GET /api/progress?learnerId=maria`

```json
{ "sessions": [{ "sessionId": "s_2026-11-10_01", "date": "2026-11-10", "answers": 4,
                 "avgStartDelayMs": 7200, "longPausesPerAnswer": 3.5, "paceWpm": 118,
                 "weakSpots": ["conflict"] }] }
```

### `POST /api/demo/seed` and `POST /api/demo/reset`

Load or clear Maria: two earlier sessions, her stories and weak spots, and the agency job posting.

## Voice out: Polly

- Each question needs two Polly calls with the same voice and the same text: one returns the audio, the other returns the timing data ("speech marks") for mouth shapes and words. Run them at the same time.
- A different voice between the two calls makes the mouth drift out of sync.
- Polly returns a symbol for each mouth shape. Group them into 8–10 mouth images; the mapping lives in `data/visemeMap.json`. The full symbol list is linked from Polly's speech marks page.
- Generate the audio and timings for every bank question ahead of time and save them under `public/audio/`. The demo then does not depend on Polly for the questions it is most likely to ask.

## Talking face: 2D lip sync at no cost

The face is not a video and uses no avatar service. It is a drawing that the browser animates in real time, so the animation itself costs nothing. The only metered part is Polly's speech, which stays inside the AWS free tier at our volume (see "Cost" below).

### How the processing works

1. **Draw the face once.** One SVG: head, eyes, eyebrows, and nine mouth shapes as separate groups, with only one visible at a time. Drawing them ourselves is free and avoids licensing questions. PNG images work the same way.
2. **Get the timings.** For each line of speech, Polly returns a list of mouth-shape events, one JSON object per line, for example `{"time":125,"type":"viseme","value":"p"}`. The server parses them into the `visemes` array of the `speak` response.
3. **Map Polly's symbols to our nine mouths.** US English uses 17 symbols plus `sil` for silence:

| Our mouth shape | Polly symbols | Sounds |
|---|---|---|
| Closed | `p`, `sil` | p, b, m, and silence |
| Lip on teeth | `f` | f, v |
| Tongue between teeth | `T` | th |
| Tongue up | `l` | l |
| Teeth nearly together | `t`, `s`, `k` | t, d, n, s, z, k, g, h |
| Lips pushed forward | `S`, `r`, `u` | sh, ch, j, r, w, oo |
| Round | `o`, `O` | oh, aw |
| Wide | `i`, `e` | ee, ih, y, ay |
| Open | `a`, `E`, `@` | ah, eh, uh |

   Keep closed, lip-on-teeth and tongue-between-teeth as separate shapes whatever else gets merged: those are the sounds a learner can actually see.

4. **Animate from the audio clock.** While the audio plays, on every animation frame read the audio's current time, find the latest mouth event at or before it, and show that mouth:

```ts
// visemes: [{ timeMs, value }] sorted by time
let i = 0
function tick() {
  const t = audio.currentTime * 1000
  while (i + 1 < visemes.length && visemes[i + 1].timeMs <= t) i++
  setMouth(visemeMap[visemes[i].value] ?? "open")
  if (!audio.paused && !audio.ended) requestAnimationFrame(tick)
  else setMouth("closed")
}
audio.onplay = () => { i = 0; requestAnimationFrame(tick) }
```

5. **Smooth it.** Ignore any mouth event shorter than about 60 milliseconds so the mouth doesn't flicker, and fade between shapes over 40–60 milliseconds with a CSS transition.
6. **Make it feel alive.** A blink every 3–5 seconds and a small head movement cost a few lines and stop the face looking frozen while she thinks.

### Speed control and slow replay, with no extra calls

Because the loop follows the audio's own clock, changing the audio element's `playbackRate` slows the voice and the mouth together and keeps them in sync. Browsers keep the pitch by default.

- **Speed control for the question:** set `playbackRate` to 0.75 or 1.
- **Slow word replay:** the word comes from her answer, not the question, so request that one word from `speak` (a few characters), cache it, play it at 0.5, and zoom the mouth with a CSS transform.

The `speed` field on `speak` is therefore optional. Use it only if slowed audio sounds too distorted.

### Cost

- Polly bills per character, and a timings request is billed like a speech request, so each line of speech costs its characters twice.
- AWS's pricing page lists a free tier of 5 million characters a month for standard voices and 1 million a month for neural voices in the first 12 months. Outside it, standard is $4 and neural $16 per million characters. Check our own account's status.
- A question is about 80 characters, so 160 with timings. Five hundred questions is 80,000 characters, far inside either allowance.
- Bank questions are generated once by `scripts/pregenerate.ts` and served as files, and repeated requests are cached by text, voice and speed.

### If Polly's timings are unavailable

Both fallbacks are free:

- **Loudness-driven mouth.** Read the audio's volume in the browser with a Web Audio analyser and switch between closed, half-open and open. It works with any audio, but it does not show real mouth shapes, so the slow replay loses its teaching value.
- **Rhubarb Lip Sync.** An open-source tool that produces mouth timings from an audio file. It runs offline, so it suits the pre-generated bank audio, not live speech.

## Coach side conversation in Spanish

The interviewer speaks only English, like a real one. At two points she can step out of the interview and talk to a coach in Spanish, then step back in exactly where she left off.

| Where | Why she would use it | Example |
|---|---|---|
| After the question, before answering | She did not understand the question | "¿Qué me está preguntando?" The coach explains the question and what a good answer covers |
| On the feedback screen | She wants to ask about the feedback or how to say something | "¿Cómo digo 'yo me encargaba de los medicamentos'?" The coach gives the English phrase and why |

### How it works

1. She taps "Preguntar al coach" and speaks or types in Spanish.
2. The recording goes to `/api/coach`. Transcribe runs with Spanish as the language.
3. Claude answers in Spanish as the coach. It is given the current question, her last answer, the feedback she received, her profile and the side conversation so far.
4. The reply is shown as text and spoken with a Spanish Polly voice. The same face can speak it; the label changes from "Interviewer" to "Coach" so the two roles stay distinct.
5. She can keep asking. "Volver a la entrevista" returns her to the question or the feedback she left.

### Rules

- **The side conversation is a separate thread.** It never changes the question order or counts as an answer. The browser holds the thread and sends it with each request, so the server keeps no extra state.
- **No penalty for asking.** If she talks to the coach before answering, the start-delay clock restarts when she returns and taps to answer.
- **English to practise comes back marked.** The reply lists any English phrases separately, so the screen can show them with a "hear it" button that uses `speak`.
- **It feeds memory.** When she leaves the side conversation, a one-line note goes to Supermemory, for example "asked what 'go above and beyond' means." A later session can open with it.
- **This replaces the separate "understanding check."** She asks when she needs to, which is closer to how people learn.

### Turn states

```
ASKING -> LISTENING -> FEEDBACK -> NEXT or RETRY
   |                       |
   +-----> COACH <---------+      COACH returns to where it was opened
```

### `POST /api/coach`

Multipart form: `audio` (PCM, optional), `text` (optional, used when she types), `sessionId`, `questionId`, `stage` (`question` or `feedback`), `thread` (JSON array of earlier side-conversation turns).

```json
// response
{
  "heard": "¿Qué significa 'go above and beyond'?",
  "reply": {
    "es": "Significa hacer más de lo que le piden. Le están preguntando por una vez que usted hizo algo extra por un cliente.",
    "phrasesEn": [{ "en": "go above and beyond", "es": "hacer más de lo esperado" }]
  },
  "audioBase64": "<mp3>",
  "visemes": [{ "timeMs": 0, "value": "s" }]
}
```

Spanish voices return their own symbol set for mouth shapes. Any symbol missing from our map falls back to the open mouth, which is good enough for the coach.

## Voice in: Transcribe

- Use the streaming interface. It accepts PCM, Ogg Opus or FLAC. Chrome's default recorder produces WebM, which streaming does not accept, so the browser captures raw samples and sends 16 kHz mono 16-bit PCM.
- The server feeds the PCM into one streaming request in small chunks and collects the final results. Each word arrives with a start time, an end time and a confidence.
- Set the language per answer: English normally, Spanish when she chose "answer in Spanish first."
- The batch interface would accept WebM, but it reads files from S3 and runs as a job. We have not found figures for how long a short clip takes, so we avoid it.

## Delivery numbers: our own code (`lib/delivery.ts`)

| Number | How it is computed | When it is mentioned (starting points, untested) |
|---|---|---|
| Start delay | Start time of her first word (recording begins when the question ends) | More than 4 seconds |
| Pace | Words divided by speaking time, per minute | Above about 170 words per minute. Slow speech is never flagged |
| Long pauses | Gaps between consecutive words longer than 1.5 seconds | Three or more in one answer |
| Speaking time | Last word end minus first word start | Under 8 seconds: the answer is too short |
| Unclear words | Words with confidence under 0.6, excluding short function words | Passed to Claude, which keeps at most two that matter to the answer |

Set these generously. Pausing to find a word in a second language is normal.

## Behaviour observations: Gemini (optional layer)

- The server wraps the same PCM as a WAV file and sends it to a Gemini model that accepts audio, with a prompt asking for short observations on how sure and how natural she sounded: hesitation, trailing off, rushing, reading from memory.
- Its output is a few short English notes in JSON. Claude turns them into learner-facing feedback; Gemini's text is never shown directly.
- The prompt forbids any comment on accent, origin or "sounding native."
- Give it a 4-second limit. If it is late or fails, Claude writes the feedback from the numbers alone.
- Gemini's documentation covers transcribing, summarising and answering questions about audio. It does not document judging delivery. Test it on our Spanish speaker's voice first, and drop it if the notes are vague or wrong.

## Written feedback: Claude

One call per answer. Inputs: the question and its type, the transcript, the delivery numbers, Gemini's notes if present, her profile, and the job posting if there is one. Output: the `feedback` object in the contract, enforced with structured output so the screen never has to parse free text.

Rules in the prompt:

- The sample answer may only use details from `usedDetails`, which must be things she said (or that are on her resume). Keep it at her English level.
- One good thing, one fix. One `practiseNext` for delivery.
- Never comment on accent or origin. No pronunciation score. Say "the software didn't catch this word," not "you said it wrong."
- Feedback in Spanish first, with English alongside.

The same model picks the next question (see below). Use low effort for both calls to keep the wait short.

## Questions

- **Bank:** `data/questions.hha.json`, 8–10 hand-written questions for home health aide, in English and Spanish, reviewed by our Spanish speaker.
- **From a posting:** when she pastes a job posting, Claude writes one or two questions from what it asks for.
- **Follow-ups:** Claude may ask one follow-up built on her last answer.
- **Fixed types**, used by every question whatever its source: `conflict`, `reliability`, `client_care`, `safety_physical`, `why_this_job`, `availability`. Weak-spot memory and the progress view depend on these.
- **Picking order:** a question of a type listed in her weak spots first, then a posting question, then the rest of the bank.

## Memory: Supermemory v5

- **Namespace:** one per learner, for example `learner_maria`. It is the first argument to every call.
- **Buckets, set once per learner:** `stories` (real work stories she has told) and `weak_spots` (question types and habits she struggles with), using `client.profiles.setBuckets`.
- **After each answer:** `client.add(namespace, { content, id: sessionId, metadata, date, dreaming: "instant" })`. The content is a short text record of the turn: question type, what she said, the story details, any weak spot. Reusing the session id keeps one session as one growing document.
- **At session start:** `client.profile(namespace, { buckets: ["stories", "weak_spots"] })`.
- **Why `dreaming: "instant"`:** by default, memories can take several minutes to form, and a new namespace can show an empty profile in that time. Instant mode makes them readable right away, at one extra billed operation per document.
- **Local fallback:** also write weak spots to `data/local/<learner>.json`. If the profile comes back empty or slow, the memory beat in the demo uses the local copy.
- **Seed early:** run the seed script well before judging, not minutes before.
- **Resume, if built:** `client.documents.uploadFile` into the same namespace.
- This project is on v5. Do not use `containerTag`, `customId`, or any path containing `/v3/` or `/v4/`.

## Files

```
app/                       setup, interview and progress pages
app/api/                   the routes above
lib/polly.ts               speech + timings
lib/transcribe.ts          streaming speech to text
lib/delivery.ts            delivery numbers
lib/gemini.ts              behaviour notes (optional)
lib/claude.ts              question picking + feedback
lib/memory.ts              Supermemory + local fallback
lib/sessionLog.ts          sessions.json
data/questions.hha.json    question bank
data/visemeMap.json        Polly symbol -> mouth image
data/seed/maria.json       demo persona
public/mouths/             mouth images
public/audio/              pre-generated question audio + timings
scripts/seed.ts            load Maria
scripts/pregenerate.ts     build public/audio
```

## Keys and permissions

Kept in `.env.local`, which is git-ignored and never committed:

- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
- `GEMINI_API_KEY`
- `SUPERMEMORY_API_KEY`
- `ANTHROPIC_API_KEY` (not needed if we reach Claude through Bedrock)

The AWS user needs permission to call Polly's speech synthesis and Transcribe's streaming transcription.

## When a service fails

| Service | What the user sees | What we do |
|---|---|---|
| Polly | The question as a caption, no voice | Bank questions use the pre-generated audio, so this only affects new questions |
| Transcribe | "I didn't catch that. Try again." | No second speech-to-text service |
| Gemini | Nothing different | Skipped after 4 seconds; Claude uses the numbers |
| Claude | Her transcript and delivery numbers, with a retry button | |
| Supermemory | Nothing different | Local fallback copy of stories and weak spots |
| Coach side conversation | "El coach no está disponible ahora." | She can still type her question; the interview itself is unaffected |

## Prizes this architecture supports

- Best Use of AWS: Polly and Transcribe.
- MLH Best Use of Gemini API: behaviour notes from the recording.
- JFFVentures, Best Overall, Best Diversity/Equality: see `TEAM_BRIEF.md`.
- Optional: MLH Best Use of MongoDB Atlas, by moving the session log there.

## Build plan

Two builders. Builder A owns the API routes and outside services. Builder B owns everything in the browser. Written Saturday 4:45pm; submission closes Sunday 11:00am MST. Task numbers match the checklist in `TEAM_BRIEF.md`.

### Phase 0: setup, contract, and proving the services (by Sat 6:00pm)

Everything later depends on these services, so prove each one with a short script before building on it.

| Task | Owner | What | Done when |
|---|---|---|---|
| Setup | Both | Repo, Next.js app, `.env.local` (git-ignored), README line crediting AI tools | The app runs locally |
| Contract | Both | Agree the route shapes in this document; save a fake response for each under `data/fake/` | B can draw every screen from fake data |
| A0 | A | One script per service: Polly audio plus timings; Transcribe streaming on a PCM clip in English and in Spanish; Supermemory add then profile in instant mode; one Claude call with structured output | Each script prints a real result |
| A1 | A, with our Spanish speaker | Question bank for home health aide | 8–10 questions, each with a type, in English and Spanish |

### Phase 1: text loop (by Sat 7:30pm)

| Task | Owner | What | Done when |
|---|---|---|---|
| A2 | A | Content feedback from a typed answer, with the accent rules in the prompt | Three typed answers get sensible feedback in Spanish |
| A3 | A | `question/next` | It picks a weak-spot type first |
| B1 | B | Interview screen on fake data: face area, captions, microphone button, feedback panel | Every state renders |
| B2 | B | Setup screen: role, pasted posting, "answer in Spanish first" | Starting a session calls `session/start` |

Checkpoint: a typed answer returns real feedback on the real screen.

### Phase 2: spoken turn (by Sat 10:00pm)

| Task | Owner | What | Done when |
|---|---|---|---|
| A4 | A | `speak`: Polly audio and timings in parallel, same voice, cached | One sentence returns audio, mouth events and word events |
| A5 | A | `answer`: PCM in, Transcribe streaming, transcript with word timings and confidence | A 20-second clip returns in a few seconds |
| B3 | B | Capture 16 kHz mono PCM in the browser and send it; recording and thinking states | The server receives a clip Transcribe accepts |
| B4 | B | Play the question; captions that switch language; speed through `playbackRate`; repeat button | Works on a bank question |
| B5 | B | Feedback panel, Spanish and English side by side: content, then delivery | Renders the full `feedback` object |

Checkpoint: our Spanish speaker completes one full spoken turn without touching the keyboard.

### Phase 3: delivery, memory and the face (by Sun 12:30am)

| Task | Owner | What | Done when |
|---|---|---|---|
| A6 | A | Delivery analyser in plain code | A rushed answer and a halting answer give clearly different numbers |
| A7 | A | Delivery feedback added to the Claude call | Neither answer's feedback mentions accent |
| A8 | A | Memory: set buckets, add after each answer, read the profile at session start, local fallback copy | After a restart, the first question targets last session's weak spot |
| B6 | B | Talking face, following "Talking face: 2D lip sync at no cost." Two-hour cap | The mouth closes on m, b and p in sync, and stays in sync at 0.75 speed |

### Phase 4: coach in Spanish and word replay (by Sun 2:30am)

| Task | Owner | What | Done when |
|---|---|---|---|
| A13 | A | `coach`: Spanish in, Claude as coach with the turn's context, Spanish voice out | A Spanish question about the feedback gets a Spanish answer with English phrases listed |
| B10 | B | Coach panel: button on the question and feedback screens, thread view, "Volver a la entrevista" | Returning lands on the same question, and the start-delay clock restarts |
| B7 | B | Slow word replay with the mouth zoomed | The picked word plays at half speed, in sync |
| A9 | A | Session log and `progress` | Two sessions return two rows |

### Phase 5: demo data and extras (by Sun 4:00am)

| Task | Owner | What | Done when |
|---|---|---|---|
| A10 | A | Seed and reset scripts; pre-generate the bank audio | Reset then seed gives the same Maria every time |
| A11 | A | Questions from a pasted job posting | One question names a requirement from the posting |
| A14 | A | Gemini behaviour notes with a 4-second limit (optional) | Kept only if its notes on our speaker's recording are specific and fair |
| B8 | B | Progress view | Shows Maria's seeded sessions and tonight's |
| B9 | B | Polish: reset button, error messages, loading states | A stranger can use it without help |

Sunday 4:00am to 7:00am is buffer: sleep, or catch up. **Feature freeze at 7:00am.**

### Phase 6: rehearse and submit (Sun 7:00am to 10:30am)

1. Run the full demo twice with the headset microphone. Fix only what breaks the demo.
2. Record the two-minute video and a screen recording to fall back on.
3. Finish the README credits and the Devpost write-up, and select each prize.
4. Submit by 10:30am.

### Also tonight, before people leave

Talk to two non-native English speakers (questions are in `TEAM_BRIEF.md` under "Validate tonight") and put one real quote in the pitch.

### If we fall behind

Cut in this order: resume upload, extra roles, the Gemini layer, job-posting questions, the coach side conversation, then the moving mouth (keep a still face). Never cut the spoken turn, the bilingual feedback, or the memory beat.

## Not verified yet

Check each of these in the first hours, before building on it:

1. Our AWS credentials can call Polly and Transcribe streaming, in a region that offers both.
2. The Polly voice we pick returns mouth-shape timings. Not every Polly voice type may.
3. Transcribe streaming handles Spanish (`es-US`) as well as English.
4. Whether Transcribe keeps "um" and "uh" in its output. If it drops them, fillers leave the confidence signal.
5. Gemini gives useful notes on delivery from a recording of our Spanish speaker.
6. The end-to-end wait is under 8 seconds.
7. Claude access: Anthropic key, or Bedrock model access on our AWS account.
8. The delivery thresholds, tried on real answers.
9. A Spanish Polly voice returns mouth-shape timings for the coach.
10. Slowed playback (`playbackRate` 0.5) still sounds clear enough for the word replay.

## Sources

- Amazon Polly speech marks: https://docs.aws.amazon.com/polly/latest/dg/speechmarks.html
- Amazon Transcribe streaming: https://docs.aws.amazon.com/transcribe/latest/dg/streaming.html
- Amazon Transcribe input formats: https://docs.aws.amazon.com/transcribe/latest/dg/input.html
- Amazon Transcribe word-level confidence: https://aws.amazon.com/about-aws/whats-new/2021/03/amazon-transcribe-supports-word-level-confidence-scores-for-streaming-transcription
- Gemini API audio guide: https://ai.google.dev/gemini-api/docs/audio
- Supermemory docs: https://supermemory.ai/docs
