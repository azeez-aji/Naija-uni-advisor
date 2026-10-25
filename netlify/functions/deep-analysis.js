// Netlify Function: /.netlify/functions/deep-analysis
//
// Written deep-dive on a student's chosen course + institution, using Google Gemini.
//
// FREE BY DEFAULT: Google's free tier covers text generation on the Flash/Flash-Lite models, but NOT
// "Grounding with Google Search" on Gemini 3 models (that needs a paid tier). So by default this
// function makes ONE plain call and clearly tells the student the answer is general guidance, not a
// live web search. If you later enable billing, set GEMINI_USE_SEARCH=true to add live Google Search.
//
// Netlify environment variables:
//   GEMINI_API_KEY      (required) Google AI Studio key — mark as secret, scope: Functions
//   GEMINI_MODEL        (optional) a model tried FIRST, e.g. if Google renames models again
//   GEMINI_USE_SEARCH   (optional) "true" = request Google Search grounding (paid tier only)

// Free-tier text models, in order. A 404 (retired) or 429 (that model's quota used) moves to the next.
const MODELS = [...new Set([process.env.GEMINI_MODEL, "gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-3.1-flash-lite"].filter(Boolean))];
const USE_SEARCH = String(process.env.GEMINI_USE_SEARCH || "").toLowerCase() === "true";
const TIMEOUT_MS = 20000; // answer or fail before Netlify's own function time limit
const ENDPOINT = (m) => `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(m)}:generateContent`;

// Light per-visitor throttle (best effort — serverless instances don't share memory).
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

async function callGemini(apiKey, model, body) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(ENDPOINT(model), {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
      signal: ctrl.signal
    });
    const raw = await res.text();
    let data = null;
    try { data = JSON.parse(raw); } catch (e) { /* non-JSON error body */ }
    return { ok: res.ok, status: res.status, data, raw };
  } catch (err) {
    if (err && err.name === "AbortError") return { ok: false, status: 0, timeout: true, raw: "timeout" };
    throw err;
  } finally {
    clearTimeout(timer);
  }
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
  const base =
    `You are an experienced, honest Nigerian university admissions advisor. Today is ${today}. ` +
    `Never give false hope and never be needlessly discouraging. Write about 300-400 words in plain prose with a few ` +
    `short "- " bullet lists. Use **bold** sparingly. No headings deeper than "##". Do not repeat the student's profile back. `;
  const systemInstruction = USE_SEARCH
    ? base + `Use Google Search to find CURRENT, specific information about the named institution and course ` +
      `(departmental cut-offs, Post-UTME format and weighting, recent news, deadlines). State a number only if you found it; ` +
      `otherwise say you could not find it. Do not claim 2027 rules are official unless a source says so.`
    : base + `You have NO web access in this mode. Do NOT state specific cut-off marks, dates, fees or deadlines as fact, and ` +
      `never invent figures. Explain how admission at this kind of institution typically works, what the student's profile ` +
      `suggests, and exactly what to verify (name the official places to check, such as the institution's admissions page, ` +
      `JAMB CAPS and the JAMB brochure/IBASS). Say clearly where you are describing a general pattern rather than a confirmed fact.`;

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
    `\n\nWrite a short deep-dive that:\n` +
    `1. Interprets our estimate and what is helping or hurting this student's chances.\n` +
    `2. Lists the specific things to verify for this institution and course before deciding.\n` +
    `3. Gives two or three concrete next actions, including a realistic plan B.`;

  const baseBody = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: { maxOutputTokens: 2048 }
  };

  try {
    let r = null, grounded = false, usedModel = null;
    for (const model of MODELS) {
      if (USE_SEARCH) {
        r = await callGemini(apiKey, model, { ...baseBody, tools: [{ google_search: {} }] });
        grounded = r.ok;
        if (!r.ok && [400, 403, 429].includes(r.status) && !/API key not valid/i.test(r.raw || "")) {
          console.error("Search-grounded call failed", model, r.status, (r.raw || "").slice(0, 300));
          r = await callGemini(apiKey, model, baseBody);   // paid-tier search unavailable -> plain answer
          grounded = false;
        }
      } else {
        r = await callGemini(apiKey, model, baseBody);
      }
      if (r.ok) { usedModel = model; break; }
      console.error("Gemini call failed", model, r.status, (r.raw || "").slice(0, 300));
      if (r.status === 404 || r.status === 429) continue;  // model retired, or its free quota used -> next model
      break;
    }

    if (!r || !r.ok) {
      const bad = r && (r.status === 401 || r.status === 403 || /API key not valid/i.test(r.raw || ""));
      const code = !r ? "upstream" : r.timeout ? "timeout" : r.status === 429 ? "busy" : bad ? "key_rejected" : r.status === 404 ? "model_unavailable" : "upstream";
      return json(502, { error: code });
    }

    const analysis = extractText(r.data);
    if (!analysis) {
      const reason = (r.data && r.data.promptFeedback && r.data.promptFeedback.blockReason) || (r.data && r.data.candidates && r.data.candidates[0] && r.data.candidates[0].finishReason) || "empty";
      console.error("Gemini returned no text:", reason);
      return json(502, { error: "empty" });
    }

    return json(200, { analysis, sources: grounded ? extractSources(r.data) : [], grounded, model: usedModel });
  } catch (err) {
    console.error("Unexpected error", String(err));
    return json(500, { error: "unexpected" });
  }
};
