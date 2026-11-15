<img src="public/brand/shift-up-logo.svg" alt="Shift Up" width="220">

# Shift Up

Interview practice in your language. A sunhacks 2026 project. Practice the interview you'll face for an hourly job, get coached in your own language on what you say and how you say it, and work with an AI that remembers what you struggled with last time.



https://github.com/user-attachments/assets/8ca7dcd5-9518-4bda-8cae-a54cbec02daf







- [`TEAM_BRIEF.md`](TEAM_BRIEF.md): the idea, who it is for, the demo flow and the task split.
- [`ARCHITECTURE.md`](ARCHITECTURE.md): services, API contract, lip sync, the Spanish coach, and the build plan.

## Run it

```
npm install
cp .env.example .env.local    # then fill in the keys
npm run dev                   # http://localhost:3000
npm test                      # unit tests
```

Any route whose service has no key answers with fake data marked `fake: true`, so the screen can be built before every key is in place.

## Status

| Part | State |
|---|---|
| API contract types, question bank, question picking | Working, tested |
| Delivery numbers (pace, pauses, start delay, unclear words) | Working, tested |
| Session log, progress route, local memory copy, demo seed and reset | Working |
| Supermemory: seed, read at session start, write each turn | Working, checked against the real service |
| Voice out with mouth timings (Polly), English and Spanish, slow replay | Working, checked against the real service |
| Voice in (Transcribe), English and Spanish | Working, checked against the real service with generated speech |
| Written feedback and Spanish coach (Grok for now; Claude if there is no Grok key) | Working, checked against the real service |
| Gemini listening to the recording for hesitation and tone | Working with generated speech; it does not notice quiet speech, so loudness is not assessed |
| Voice mode: the coach reads the feedback aloud | Working in the browser |
| Website: landing and setup page, interview screen with the lip-synced face, feedback, Spanish coach panel, progress page | Working in the browser; English and Spanish interface |

## Credits

Built during sunhacks 2026. We used Claude Code (Anthropic's Claude) to help plan, write and review the code and documents in this repository. Services used: Amazon Polly, Amazon Transcribe, the xAI Grok API (with Claude as the alternative), the Gemini API, and Supermemory.
