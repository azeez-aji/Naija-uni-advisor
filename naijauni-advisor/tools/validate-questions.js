#!/usr/bin/env node
/**
 * Validates questions.js — run before every deploy:   node tools/validate-questions.js
 * Exits with code 1 if anything would break the mock exam or practice centre.
 */
const path = require("path");
const { QUESTION_BANK, PASSAGES } = require(path.join(__dirname, "..", "questions.js"));

const SUBJECTS = ["english", "mathematics", "physics", "chemistry", "biology", "economics", "government", "accounting"];
const DIFFS = [null, "easy", "moderate", "hard"];
const STATUS = ["ai-reviewed", "verified", "needs-review", "retired"];
const errors = [], warnings = [];
const ids = new Set(), stems = new Map();
const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, "");

QUESTION_BANK.forEach(q => {
  const w = `${q.id || "(no id)"}`;
  if (!q.id) errors.push("missing id: " + q.q);
  if (ids.has(q.id)) errors.push(w + " duplicate id");
  ids.add(q.id);
  if (!SUBJECTS.includes(q.subject)) errors.push(w + " unknown subject " + q.subject);
  if (!q.topic) errors.push(w + " missing topic");
  if (!q.q || q.q.trim().length < 8) errors.push(w + " question text too short");
  if (!Array.isArray(q.opts) || q.opts.length !== 4) errors.push(w + " needs exactly 4 options");
  else if (new Set(q.opts.map(o => String(o).trim().toLowerCase())).size !== 4) errors.push(w + " has repeated options");
  if (!Number.isInteger(q.ans) || q.ans < 0 || q.ans > 3) errors.push(w + " answer index out of range");
  if (!DIFFS.includes(q.difficulty === undefined ? null : q.difficulty)) errors.push(w + " bad difficulty " + q.difficulty);
  if (!STATUS.includes(q.status)) errors.push(w + " bad status " + q.status);
  if (q.passage && !PASSAGES[q.passage]) errors.push(w + " references missing passage " + q.passage);
  const k = norm(q.q || "");
  if (stems.has(k)) errors.push(w + " duplicates the question text of " + stems.get(k)); else stems.set(k, w);
  if (!q.explanation) warnings.push(w);
});

// Mock-exam capacity: English needs 60 per paper, each elective needs 40
const by = {};
QUESTION_BANK.forEach(q => { (by[q.subject] = by[q.subject] || { total: 0, expl: 0, topics: {}, diff: { easy: 0, moderate: 0, hard: 0, ungraded: 0 }, verified: 0 }); const b = by[q.subject]; b.total++; if (q.explanation) b.expl++; b.topics[q.topic] = (b.topics[q.topic] || 0) + 1; b.diff[q.difficulty || "ungraded"]++; if (q.status === "verified") b.verified++; });
const passageQs = QUESTION_BANK.filter(q => q.subject === "english" && q.passage).length;
SUBJECTS.forEach(s => {
  const need = s === "english" ? 60 : 40;
  const have = by[s] ? by[s].total : 0;
  if (have < need) errors.push(`${s}: only ${have} questions, mock exam needs ${need}`);
});
if (by.english && by.english.total - passageQs < 50) warnings.push("english: few non-passage questions");

console.log("QUESTION BANK REPORT  (" + QUESTION_BANK.length + " questions)\n");
SUBJECTS.forEach(s => {
  const b = by[s]; if (!b) return;
  console.log(`${s.padEnd(12)} total ${String(b.total).padStart(3)} | explained ${String(b.expl).padStart(3)} | human-verified ${String(b.verified).padStart(3)} | easy ${b.diff.easy} mod ${b.diff.moderate} hard ${b.diff.hard} ungraded ${b.diff.ungraded}`);
  Object.keys(b.topics).sort().forEach(t => console.log(`    ${String(b.topics[t]).padStart(3)}  ${t}`));
});
console.log(`\nQuestions still without a worked explanation: ${warnings.length}`);
if (errors.length) { console.error("\nERRORS (" + errors.length + "):\n" + errors.join("\n")); process.exit(1); }
console.log("\nOK — question bank is valid.");
