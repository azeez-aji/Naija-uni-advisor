# NaijaUni Advisor

An instant, honest JAMB/UTME admission-chances checker for Nigerian students —
rule-based verdict runs entirely in the browser (works offline once loaded),
with an optional AI deep-dive for current, researched context.

## What's in this repo

```
index.html                    # app shell
styles.css                    # design system (ink-teal + gold, Newsreader/Public Sans/IBM Plex Mono)
data.js                       # course + institution dataset, JAMB 2026/2027 minimums
app.js                        # wizard, rule engine, rendering, PWA install logic
manifest.json + sw.js         # PWA install + offline caching
icons/                        # app icons
netlify.toml                  # Netlify build config
netlify/functions/deep-analysis.js   # serverless function powering the AI deep-dive
```

## Deploy it (same flow you already use for Hasbal Global Solutions)

1. **Create a new GitHub repo** — e.g. `AbuKhayrAZ/naijauni-advisor`. Upload every
   file in this folder, keeping the folder structure intact (especially
   `netlify/functions/deep-analysis.js` — it must stay in that exact path).
2. **Connect it in Netlify** — "Add new site" → "Import an existing project" →
   pick the new repo. Build settings are already defined in `netlify.toml`, so
   you can leave the build command blank and publish directory as `.`.
3. **Add your Anthropic API key** — in Netlify: Site settings → Environment
   variables → add `ANTHROPIC_API_KEY` with your key from
   [console.anthropic.com](https://console.anthropic.com). Without this, the
   instant rule-based verdict still works perfectly — only the "AI deep-dive"
   button needs the key.
4. Deploy. Netlify auto-builds on every push to `main`, same as your other site.

## Updating content later

- **Course/institution data** (cut-off marks, subject requirements, career
  notes) lives entirely in `data.js` — no need to touch `app.js` for content
  updates. Search for the course or institution name and edit the object directly.
- Since JAMB's national minimum and institutional cut-offs are re-set every
  admissions cycle (usually announced around May), plan to revisit
  `NATIONAL_MINIMUMS` and the `INSTITUTIONS` array once a year.
- To edit via the GitHub UI the way you usually do: open `data.js`, pencil icon,
  Ctrl+F for the exact institution/course name, edit, commit to `main`.

## How the verdict is calculated

For transparency (and so you can defend it to a skeptical parent or student):

1. Checks O'Level credits (A1–C6) against the course's required + alternative
   subjects, and confirms a credit in English Language.
2. Compares the JAMB score against the institution's known 2026/2027 minimum
   admissible score (falls back to JAMB's national minimum — 150 for
   universities, 100 for polytechnics, 150 for nursing colleges — when a
   specific figure isn't on file).
3. Adds a "realistic competitiveness" bonus on top of that minimum, based on
   how oversubscribed the course tier tends to run nationally (Medicine/Law/
   Pharmacy add the most; Education/Arts add the least), informed by publicly
   reported 2026 cut-off patterns.
4. A subject-combination mismatch or a score below the institution's actual
   minimum always caps the verdict at "Very Low" — no score can compensate for
   a hard eligibility gap.

This is **an estimate, not an admission decision** — the app says so
throughout, and it should keep saying so if you extend it.

## The AI deep-dive

`netlify/functions/deep-analysis.js` calls the Anthropic API with web search
enabled, so it can surface current, department-specific detail the static
dataset can't (recent cut-off announcements, Post-UTME format changes, etc.).
It costs a small amount per request against your Anthropic account — there's
no rate limiting built in yet, so if this gets real traffic, consider adding
a simple per-IP rate limit in the function before it goes wide.
