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
cbt-exam.html                  # standalone JAMB CBT practice exam, linked from the app
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

This was substantially reworked based on real feedback — the first version scored
purely on JAMB number vs. a made-up "realistic threshold," which isn't how Nigerian
admissions actually work. Here's the current, more honest version:

1. **O'Level isn't just pass/fail anymore.** Each credit (A1–C6) contributes a
   grade point (A1=1 … C6=6, the same convention several institutions use
   directly). The best 5 relevant credits are converted into an "O'Level
   strength" percentage — an all-A1 profile scores ~100%, an all-C6 profile
   scores ~40%. A1s and C6s now genuinely produce different verdicts.
2. **Admission is an aggregate, not just JAMB.** Most Nigerian institutions
   rank candidates by a blended score — JAMB + Post-UTME + (sometimes)
   O'Level — not JAMB alone. `data.js` carries a `weights` field per
   institution (`{jamb, postUtme, olevel}`). Where an institution's actual
   published formula was corroborated (UNILAG, OAU, UNIBEN, BUK, UNICAL,
   FUTA, LASU), it's used directly and marked `formulaConfidence: "verified"`.
   Every other institution falls back to the commonly-reported general
   pattern (50% JAMB / 30% Post-UTME / 20% O'Level, or 50/50 JAMB/O'Level for
   schools that don't run Post-UTME) and is marked `"estimated"` — the app
   says so on the results screen, not just in this file.
3. **Post-UTME: target, not guess.** Since most students use this tool
   *before* sitting Post-UTME, the app doesn't ask them to invent a score.
   Instead it solves the institution's own formula backwards and tells them
   what Post-UTME score they'd need to clear the line or sit solidly in
   "Strong" territory. If they've actually sat it, there's an optional field
   on the results screen to plug in the real score for an updated verdict —
   that live-recomputes via `computeAssessment()`.
4. A subject-combination mismatch or a JAMB score below the institution's
   actual minimum still hard-caps the verdict at "Very Low" — no aggregate
   score compensates for a hard eligibility gap.

None of this replaces checking the institution's own admissions portal —
formulas and cut-offs get revised yearly and the app says so throughout.

## Institution coverage

104 institutions across federal/state/private universities, polytechnics,
and colleges of education — up from an initial ~30. Cut-off figures beyond
each type's JAMB national minimum are publicly reported for oversubscribed
institutions and were cross-checked against multiple sources during
research; expect some drift year to year (LAUTECH alone was reported as
160, 170, and 180 across different sites while building this — 170 was
used as the most commonly cited figure). "Other [type] (not listed)"
entries exist for anything not individually covered, using the JAMB
national minimum for that institution type.


## The AI deep-dive

`netlify/functions/deep-analysis.js` calls the Anthropic API with web search
enabled, so it can surface current, department-specific detail the static
dataset can't (recent cut-off announcements, Post-UTME format changes, etc.).
It costs a small amount per request against your Anthropic account — there's
no rate limiting built in yet, so if this gets real traffic, consider adding
a simple per-IP rate limit in the function before it goes wide.

## Troubleshooting

- **"Page not found" on the live URL:** almost always means the repo has an
  extra folder level (e.g. files sitting inside `naijauni-advisor/naijauni-advisor/`
  instead of at the repo root). Either flatten the repo so `index.html` sits
  directly at the root, or in Netlify set **Base directory**, **Publish
  directory**, and **Functions directory** to point at the actual subfolder.
- **AI deep-dive fails even with `ANTHROPIC_API_KEY` set:** check the model ID
  in `deep-analysis.js` is current — Anthropic ships new model versions
  regularly and an outdated ID returns an error that looks identical to a
  missing/invalid key from the front end. Check Netlify's function logs
  (Project → Logs & metrics → Functions) for the actual upstream error rather
  than guessing from the browser.
- **Want zero ongoing AI cost:** the rule-based verdict (the whole wizard +
  results screen) needs no API key at all and works fully offline. You can
  ship the site without ever setting `ANTHROPIC_API_KEY` — the deep-dive
  button will just show its "couldn't reach the service" message, and
  everything else works normally.
- **A device (often Android) is stuck showing an old version of the site:**
  this was a real bug, now fixed — `sw.js` used to serve cached pages first
  and only refresh the cache in the background, so returning visitors could
  be stuck on stale content indefinitely (Android holds onto service workers
  more persistently than desktop browsers typically do). It's now
  network-first: online visitors always get the latest deploy, and the cache
  is only used as an offline fallback. If a specific device is still stuck
  after you've redeployed, one visit while online will self-heal it — or as
  a manual fix: Chrome on Android → Settings → Site settings → find the
  site → **Clear & reset**.

