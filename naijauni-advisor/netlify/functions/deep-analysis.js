// Netlify Function: /.netlify/functions/deep-analysis
//
// Uses Google Gemini (AI Studio key) with Grounding with Google Search to produce a short,
// current, source-linked read-out for one student's chosen course and institution.
//
// Netlify environment variables:
//   GEMINI_API_KEY  (required)  your Google AI Studio key — mark it as a secret, scope: Functions
//   GEMINI_MODEL    (optional)  defaults to gemini-2.5-flash. Google renames/retires models often;
//                               if the deep-dive suddenly stops working, set this to a current
//                               Flash model name from https://aistudio.google.com and redeploy.

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const ENDPOINT = (m) => `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent`;

// Light per-visitor throttle (best effort — serverless instances don't share memory) so one
// person can't burn the free daily quota for everyone.
const hits = new Map();
function throttled(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 500) hits.clear();
  return recent.length > 4;
}

const clip = (v, n) => String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n);
const json = (statusCode, obj) => ({ statusCode, headers: { "Content-Type": "application/json" }, body: JSON.stringify(obj) });

async function callGemini(apiKey, body) {
  const res = await fetch(ENDPOINT(MODEL), {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(body)
  });
  const raw = await res.text();
  let data = null;
  try { data = JSON.parse(raw); } catch (e) { /* non-JSON error body */ }
  return { ok: res.ok, status: res.status, data, raw };
}

function extractText(data) {
  const parts = (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
  return parts.map((p) => p.text || "").join("").trim();
}

function extractSources(data) {
  const chunks = (data && data.candidates && data.candidates[0] && data.candidates[0].groundingMetadata && data.candidates[0].groundingMetadata.groundingChunks) || [];
  const seen = new Set();
  const out = [];
  chunks.forEach((c) => {
    const w = c && c.web;
    if (w && w.uri && !seen.has(w.uri)) { seen.add(w.uri); out.push({ title: clip(w.title || w.uri, 120), url: w.uri }); }
  });
  return out.slice(0, 5);
}

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") return json(405, { error: "method_not_allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set for this site/function.");
    return json(500, { error: "not_configured" });
  }

  const ip = (event.headers && (event.headers["x-nf-client-connection-ip"] || event.headers["x-forwarded-for"])) || "anon";
  if (throttled(String(ip).split(",")[0].trim())) return json(429, { error: "slow_down" });

  let p;
  try { p = JSON.parse(event.body || "{}"); } catch (e) { return json(400, { error: "bad_json" }); }

  const jambScore = Number(p.jambScore);
  const course = clip(p.course, 120);
  const institution = clip(p.institution, 160);
  if (!(jambScore >= 0 && jambScore <= 400) || !course || !institution) return json(400, { error: "missing_fields" });

  const olevel = (Array.isArray(p.olevel) ? p.olevel : []).slice(0, 12)
    .map((r) => `${clip(r && r.subject, 40)}: ${clip(r && r.grade, 3)}`).join(", ");
  const careerInterests = clip(p.careerInterests, 500);
  const band = clip(p.ruleBasedBand, 20);
  const aggregate = Number.isFinite(Number(p.aggregatePct)) ? Number(p.aggregatePct) : null;
  const threshold = Number.isFinite(Number(p.threshold)) ? Number(p.threshold) : null;
  const postUtmeIncluded = !!p.postUtmeIncluded;

  const today = new Date().toDateString();
  const systemInstruction =
    `You are an experienced, honest Nigerian university admissions advisor. Today is ${today}. ` +
    `Never give false hope and never be needlessly discouraging. Use Google Search to find CURRENT, specific information ` +
    `about the named institution and course (departmental cut-off marks, Post-UTME screening format and weighting, ` +
    `recent admission news, deadlines). State a number only if you found it; if you could not find department-specific ` +
    `data, say so plainly instead of guessing. Distinguish what is confirmed from what is typical. Do not claim 2027 ` +
    `rules are official unless a source says so. Write about 300-400 words in plain prose with a few short "- " bullet ` +
    `lists. Use **bold** sparingly. No headings deeper than "##". Do not repeat the student's profile back.`;

  const userPrompt =
    `Student profile:\n` +
    `- JAMB UTME score: ${jambScore}/400\n` +
    `- O'Level results: ${olevel || "not provided"}\n` +
    `- Intended course: ${course}\n` +
    `- Intended institution: ${institution}\n` +
    `- Career interests: ${careerInterests || "not specified"}\n` +
    `- Our own rule-based estimate: "${band || "n/a"}"` +
    (aggregate != null && threshold != null
      ? `, an aggregate of about ${aggregate}% against a realistic line of about ${threshold}% for this course tier (${postUtmeIncluded ? "includes the student's Post-UTME score" : "JAMB + O'Level only; Post-UTME not yet included"}).`
      : ".") +
    `\n\nResearch this institution and course for the current admissions cycle, then write a short deep-dive that:\n` +
    `1. Confirms or corrects our estimate using anything specific to this department (recent cut-offs, Post-UTME format/weighting, competition).\n` +
    `2. Flags anything time-sensitive (deadlines, portal status, policy changes).\n` +
    `3. Gives one or two concrete next actions beyond generic advice.`;

  const baseBody = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: { maxOutputTokens: 4096 }
  };

  try {
    // 1) Grounded answer (live Google Search)
    let r = await callGemini(apiKey, { ...baseBody, tools: [{ google_search: {} }] });
    let grounded = true;

    // 2) If search grounding isn't available on this key/model/quota, fall back to an
    //    ungrounded answer (clearly flagged) rather than failing outright.
    if (!r.ok && [400, 403, 404, 429].includes(r.status)) {
      console.error("Grounded call failed", r.status, (r.raw || "").slice(0, 400));
      r = await callGemini(apiKey, baseBody);
      grounded = false;
    }

    if (!r.ok) {
      console.error("Gemini call failed", r.status, (r.raw || "").slice(0, 400));
      const code = r.status === 429 ? "busy" : r.status === 401 || r.status === 403 ? "key_rejected" : "upstream";
      return json(502, { error: code });
    }

    const analysis = extractText(r.data);
    if (!analysis) {
      const reason = (r.data && r.data.promptFeedback && r.data.promptFeedback.blockReason) || (r.data && r.data.candidates && r.data.candidates[0] && r.data.candidates[0].finishReason) || "empty";
      console.error("Gemini returned no text:", reason);
      return json(502, { error: "empty" });
    }

    return json(200, { analysis, sources: grounded ? extractSources(r.data) : [], grounded, model: MODEL });
  } catch (err) {
    console.error("Unexpected error", String(err));
    return json(500, { error: "unexpected" });
  }
};
