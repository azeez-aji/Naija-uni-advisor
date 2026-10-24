# NaijaUni Advisor

An instant, honest JAMB/UTME admission-chances checker for Nigerian students -
rule-based verdict runs entirely in the browser (works offline once loaded),
with an optional AI deep-dive for current, researched context.

## What's in this repo

```
index.html, app.js, data.js    # NaijaUni Advisor (admission-chances checker, 400+ institutions)
styles.css                     # shared design system
practice.html                  # NEW: subject-by-subject practice centre (topics, explanations, progress)
cbt-exam.html                  # full 180-question mock exam (exam mode + optional learning mode)
questions.js                   # NEW: ONE shared question bank used by both practice.html and cbt-exam.html
tools/validate-questions.js    # NEW: run before every deploy to catch broken questions
manifest.json + sw.js          # installable PWA, network-first so updates always reach students
netlify.toml                   # Netlify config + no-cache headers
netlify/functions/deep-analysis.js   # optional AI deep-dive (needs ANTHROPIC_API_KEY)
```

## The three parts, and how they connect

1. **Advisor**: course + institution + score → honest verdict, then links to practise exactly the subjects that course needs.
2. **Practice centre**: one subject at a time; filter by topic and difficulty; Learn mode (instant explanation) or Exam mode; flag questions; retry the ones you missed; progress stored on the student's device.
3. **Full mock**: 4 subjects, 180 questions, 2 hours. Each paper is sampled from the bank, so no two attempts are identical. Results list the weakest topics and link straight back into the practice centre.

All three read the same `questions.js`, so there is one answer key.

## Hosting recommendation

Keep the app on Netlify and give it its own subdomain, e.g. **jamb.hasbal.com.ng** (Netlify → Domain management → Add domain; at your DNS provider add a `CNAME` for `jamb` pointing to your `*.netlify.app` address). Keep **blog.hasbal.com.ng** for articles that link into the app. Blogger cannot serve a multi-file app with a service worker, and an iframe would break installing it and working offline.

## Updating the question bank

Questions live in `questions.js` as records: `{ id, subject, topic, difficulty, q, opts[4], ans(0-3), explanation, status, origin }`.

1. Append new records to `QUESTION_BANK` using the next free id (e.g. `phy-0064`).
2. Run `node tools/validate-questions.js` : it checks ids, four distinct options, answer index, duplicates, mock-exam capacity and prints coverage per topic.
3. Commit. Students get the update on their next visit (the service worker is network-first).

**Status honesty:** every question is currently `ai-reviewed`, meaning written/checked by AI but **not yet signed off by a subject teacher**. Change a record to `verified` only after a teacher has checked it. About 340 older questions still have no worked explanation or difficulty grade; the practice page says so rather than hiding it.

## What is verified vs. pending (as of 20 Oct 2026)

- **Confirmed from reporting:** UTME format (English 60 + three subjects × 40 = 180 questions, 2 hours); 2026/27 national minimums (universities 150, polytechnics/colleges of education 100; nursing 150 per the JAMB bulletin as reported).
- **Not confirmed by JAMB yet:** 2027 registration dates, syllabus changes and the 2027 English reading text. The mock's reading-text questions use *The Lekki Headmaster* (confirmed through 2026) and say so on screen. Check jamb.gov.ng / IBASS when 2027 details are released.
- **Scoring:** JAMB publishes no official conversion. The mock reports an *estimated* UTME-style score (each subject scaled to 100 marks, English 60 questions, others 40) and labels it as an estimate.

## Deploy it

1. **Create a new GitHub repo** : e.g. `AbuKhayrAZ/naijauni-advisor`. Upload every
   file in this folder, keeping the folder structure intact (especially
   `netlify/functions/deep-analysis.js` : it must stay in that exact path).
2. **Connect it in Netlify** : "Add new site" → "Import an existing project" →
   pick the new repo. Build settings are already defined in `netlify.toml`, so
   you can leave the build command blank and publish directory as `.`.
3. **Add your Anthropic or Gemini API key** : in Netlify: Site settings → Environment
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

402 entries: about 190 universities (federal, state, private), 146 polytechnics, 65 colleges of education, 1 nursing college, plus "Other … (not listed)" catch-alls. Compiled from NUC-, NBTE- and NCCE-based reference lists in Oct 2026. Several federal colleges of education (Zaria, Kano, Alvan Ikoku) have since become federal universities of education and are listed as such. Only a minority of institutions carry institution-specific cut-offs or verified formulas; everything else uses the JAMB national minimum for its type and is clearly marked "estimated". The private-university list is not exhaustive — use "Other private university". Cut-off figures beyond
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

