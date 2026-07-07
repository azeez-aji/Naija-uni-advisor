// Netlify Function: /.netlify/functions/deep-analysis
// Calls the Anthropic API (with web search) to produce a current,
// researched admissions read-out. Requires ANTHROPIC_API_KEY to be
// set as an environment variable in the Netlify site settings.

exports.handler = async function (event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured on this site." })
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON body." }) };
  }

  const {
    jambScore, course, institution, olevel = [],
    careerInterests = "", ruleBasedBand = "", threshold = ""
  } = payload;

  if (!jambScore || !course || !institution) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing required fields." }) };
  }

  const olevelSummary = olevel
    .map(r => `${r.subject}: ${r.grade}`)
    .join(", ");

  const systemPrompt = `You are an experienced Nigerian university admissions advisor. You are honest and never give false hope, but you are also encouraging and practical. You have access to web search — use it to find the most current, specific information about the named institution and course for the current admissions cycle (department cut-off marks, Post-UTME screening format, recent admission news). Ground concrete numeric claims in what you find; if you cannot find department-specific data, say so plainly rather than inventing a figure. Keep the response to about 300-400 words, in plain prose with occasional short bullet lists, using markdown-style "**bold**" and "- " bullets only (no headers deeper than "##"). Do not use false precision — round numbers and hedge appropriately when the source is uncertain.`;

  const userPrompt = `Student profile:
- JAMB UTME score: ${jambScore}
- O'Level results: ${olevelSummary || "not provided"}
- Intended course: ${course}
- Intended institution: ${institution}
- Career interests: ${careerInterests || "not specified"}
- Our own rule-based estimate already gave this a "${ruleBasedBand}" admission-strength rating, using a realistic score threshold around ${threshold}.

Research this institution and course for the current admissions cycle and write a short, current-context deep-dive that:
1. Confirms or updates our rule-based estimate with anything you find that's specific to this department (recent cut-off marks, Post-UTME format/weighting, competition level this cycle).
2. Flags anything time-sensitive (deadlines, portal status, policy changes) if you find it.
3. Gives one or two concrete, current-context action recommendations beyond generic advice.
Do not repeat the full profile back to the student — get straight to the analysis.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 1200,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        tools: [{ type: "web_search_20260318", name: "web_search" }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return { statusCode: 502, headers, body: JSON.stringify({ error: "Upstream API error", detail: errText }) };
    }

    const data = await response.json();
    const analysis = (data.content || [])
      .filter(block => block.type === "text")
      .map(block => block.text)
      .join("\n\n")
      .trim();

    return {
      statusCode: 200,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ analysis: analysis || "No analysis was returned." })
    };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: "Unexpected error", detail: String(err) }) };
  }
};
