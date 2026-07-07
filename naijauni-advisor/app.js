/* =========================================================
   NaijaUni Advisor — application logic
   ========================================================= */

const STORAGE_KEY = "naijauni_advisor_v1";

const state = {
  step: 0, // 0 = landing, 1-5 = wizard steps, 6 = results
  jambScore: null,
  olevel: [], // { subject, grade }
  sittings: 1, // 1 or 2 (single sitting vs combined WAEC/NECO)
  courseId: null,
  institutionId: null,
  careerInterests: "",
  result: null
};

const TOTAL_STEPS = 5;

/* ---------- persistence ---------- */
function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) { /* storage unavailable — silently continue */ }
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    Object.assign(state, saved);
  } catch (e) { /* ignore corrupt state */ }
}

/* ---------- helpers ---------- */
function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  (Array.isArray(children) ? children : [children]).forEach(c => {
    if (c == null) return;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  });
  return node;
}

function getCourse(id) { return COURSES.find(c => c.id === id); }
function getInstitution(id) { return INSTITUTIONS.find(i => i.id === id); }

/* ---------- searchable combobox ---------- */
function createSearchableSelect({ items, getLabel, getSubLabel, placeholder, initialId, getId, onSelect }) {
  const wrap = el("div", { class: "combobox" });
  const input = el("input", {
    type: "text", class: "combobox-input", placeholder,
    autocomplete: "off", inputmode: "search"
  });
  const list = el("div", { class: "combobox-list", role: "listbox" });
  list.hidden = true;
  wrap.appendChild(input);
  wrap.appendChild(list);

  let filtered = items.slice();
  let activeIndex = -1;

  function renderList() {
    list.innerHTML = "";
    if (filtered.length === 0) {
      list.appendChild(el("div", { class: "combobox-empty" }, "No matches — try a different search"));
    } else {
      filtered.slice(0, 60).forEach((item, i) => {
        const row = el("div", {
          class: "combobox-item" + (i === activeIndex ? " active" : ""),
          role: "option",
          onclick: () => choose(item)
        }, [
          el("span", { class: "combobox-item-label" }, getLabel(item)),
          getSubLabel ? el("span", { class: "combobox-item-sub" }, getSubLabel(item)) : null
        ]);
        list.appendChild(row);
      });
    }
    list.hidden = false;
  }

  function choose(item) {
    input.value = getLabel(item);
    list.hidden = true;
    onSelect(getId(item));
  }

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    filtered = q === "" ? items.slice() : items.filter(it => getLabel(it).toLowerCase().includes(q));
    activeIndex = -1;
    renderList();
    if (q === "") onSelect(null);
  });
  input.addEventListener("focus", () => { filtered = items.slice(); renderList(); });
  input.addEventListener("keydown", (e) => {
    if (list.hidden) return;
    if (e.key === "ArrowDown") { e.preventDefault(); activeIndex = Math.min(activeIndex + 1, filtered.length - 1); renderList(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); activeIndex = Math.max(activeIndex - 1, 0); renderList(); }
    else if (e.key === "Enter") { e.preventDefault(); if (filtered[activeIndex]) choose(filtered[activeIndex]); }
    else if (e.key === "Escape") { list.hidden = true; }
  });
  document.addEventListener("click", (e) => { if (!wrap.contains(e.target)) list.hidden = true; });

  if (initialId) {
    const found = items.find(it => getId(it) === initialId);
    if (found) input.value = getLabel(found);
  }

  return wrap;
}

/* =========================================================
   Assessment engine (rule-based, runs entirely client-side)
   ========================================================= */
function computeAssessment() {
  const course = getCourse(state.courseId);
  const inst = getInstitution(state.institutionId);
  const score = Number(state.jambScore);

  const credits = state.olevel.filter(r => CREDIT_GRADES.includes(r.grade));
  const creditSubjects = new Set(credits.map(r => r.subject));
  const creditCount = credits.length;

  const hasEnglish = creditSubjects.has("English Language");
  const requiredNonEnglish = (course.required || []).filter(s => s !== "English Language");
  const missingRequired = requiredNonEnglish.filter(s => !creditSubjects.has(s));
  const oneOfOk = !course.oneOf || course.oneOf.some(s => creditSubjects.has(s));

  const subjectCombinationMet = missingRequired.length === 0 && oneOfOk && hasEnglish;

  const instMin = getInstitutionMinimum(inst);
  const prestigeBonus = (inst.prestige - 1) * PRESTIGE_POINTS;
  const threshold = instMin + TIER_BONUS[course.tier] + prestigeBonus;

  const belowLegalMinimum = score < instMin;

  let band;
  if (!subjectCombinationMet || belowLegalMinimum) {
    band = "very_low";
  } else if (score >= threshold + 25) {
    band = "very_strong";
  } else if (score >= threshold + 5) {
    band = "strong";
  } else if (score >= threshold - 15) {
    band = "moderate";
  } else if (score >= threshold - 40) {
    band = "low";
  } else {
    band = "very_low";
  }

  const concerns = [];
  if (belowLegalMinimum) {
    concerns.push(`Your JAMB score (${score}) is below ${inst.name}'s minimum admissible score (${instMin}) for the 2026/2027 session — institutions are not permitted to admit below this line.`);
  }
  if (!hasEnglish) {
    concerns.push("A credit pass in English Language is missing — this is compulsory for every course and institution in Nigeria.");
  }
  if (missingRequired.length > 0) {
    concerns.push(`Missing required credit(s) for ${course.name}: ${missingRequired.join(", ")}.`);
  }
  if (!oneOfOk && course.oneOf) {
    concerns.push(`None of the accepted alternative subjects (${course.oneOf.join(" / ")}) show a credit pass.`);
  }
  if (creditCount < 5) {
    concerns.push(`Only ${creditCount} credit pass(es) recorded — most institutions require a minimum of 5 credits, including English (and Mathematics for most Science/Management courses).`);
  }
  if (score < threshold && subjectCombinationMet && !belowLegalMinimum) {
    concerns.push(`${course.name} at ${inst.name} realistically trends nearer ${threshold} based on how competitive this course tier tends to run — your score sits below that line.`);
  }

  const metRequirements = [];
  if (hasEnglish) metRequirements.push("Credit pass in English Language");
  requiredNonEnglish.forEach(s => { if (creditSubjects.has(s)) metRequirements.push(`Credit pass in ${s}`); });
  if (course.oneOf && oneOfOk) {
    const matched = course.oneOf.find(s => creditSubjects.has(s));
    if (matched) metRequirements.push(`Credit pass in ${matched} (satisfies the ${course.oneOf.join("/")} requirement)`);
  }
  if (!belowLegalMinimum) metRequirements.push(`JAMB score meets ${inst.name}'s minimum admissible score (${instMin})`);

  const alternatives = buildAlternatives({ course, inst, score, subjectCombinationMet, threshold });

  return {
    course, inst, score, threshold, instMin, band,
    creditCount, subjectCombinationMet, concerns, metRequirements, alternatives
  };
}

function buildAlternatives({ course, inst, score, subjectCombinationMet, threshold }) {
  const alts = [];

  const cheaperInstitutions = INSTITUTIONS
    .filter(i => i.id !== inst.id && i.minCutoff != null)
    .map(i => ({ inst: i, thresh: getInstitutionMinimum(i) + TIER_BONUS[course.tier] + (i.prestige - 1) * PRESTIGE_POINTS }))
    .filter(x => x.thresh <= score)
    .sort((a, b) => b.thresh - a.thresh);
  if (cheaperInstitutions.length > 0) {
    const pick = cheaperInstitutions[0];
    alts.push({
      title: `${course.name} at ${pick.inst.name}`,
      why: `Your score comfortably clears the realistic band here (≈${pick.thresh}), versus ≈${threshold} at ${inst.name}.`
    });
  }

  const relatedCourse = COURSES
    .filter(c => c.id !== course.id && c.category === course.category && c.tier < course.tier)
    .sort((a, b) => b.tier - a.tier)[0];
  if (relatedCourse) {
    const relThreshold = getInstitutionMinimum(inst) + TIER_BONUS[relatedCourse.tier] + (inst.prestige - 1) * PRESTIGE_POINTS;
    alts.push({
      title: `${relatedCourse.name} at ${inst.name}`,
      why: `A related field in the same faculty area with a more attainable realistic band (≈${relThreshold}) — worth considering as a Post-UTME second choice.`
    });
  } else {
    const fallback = COURSES.filter(c => c.tier <= 2 && c.id !== course.id)[0];
    if (fallback) {
      alts.push({
        title: `${fallback.name} at ${inst.name}`,
        why: "A less oversubscribed course that keeps you in a related academic track while easing the score pressure."
      });
    }
  }

  if (!subjectCombinationMet) {
    alts.push({
      title: "Direct Entry via IJMB / JUPEB",
      why: "A one-year A-Level-equivalent programme (IJMB or JUPEB) can let you enter at 200 level and often has more flexible subject-combination rules than fresh UTME entry."
    });
  } else if (score < threshold) {
    alts.push({
      title: "Register for Post-UTME at 2–3 institutions",
      why: "JAMB's CAPS system lets you hold admission offers from multiple institutions — apply broadly rather than pinning hopes on one school."
    });
  } else {
    alts.push({
      title: "Prepare a backup choice on your JAMB profile",
      why: "Even strong candidates should list a realistic second choice institution on CAPS in case departmental quotas fill up."
    });
  }

  return alts.slice(0, 3);
}

const BAND_META = {
  very_strong: { label: "Very Strong", color: "#1F8A5F", bg: "#EAF6EF", border: "#BFE4CE", desc: "Your profile clears the realistic bar with room to spare." },
  strong: { label: "Strong", color: "#1F8A5F", bg: "#EAF6EF", border: "#BFE4CE", desc: "You meet the requirements and sit comfortably above the typical line." },
  moderate: { label: "Moderate", color: "#C98A24", bg: "#FBF2E2", border: "#F0D9A8", desc: "You're in range, but this is close enough that backup choices matter." },
  low: { label: "Low", color: "#C0553F", bg: "#FBECE8", border: "#F0C4B7", desc: "Admission here is unlikely this cycle without a change in strategy." },
  very_low: { label: "Very Low", color: "#8C2F39", bg: "#F7E8EA", border: "#E7BCC1", desc: "One or more hard requirements aren't currently met." }
};

const ACTION_PLANS = {
  very_strong: [
    "Complete your Post-UTME registration for this institution as soon as the portal opens.",
    "Gather original O'Level result(s), JAMB result slip, and birth certificate ahead of screening.",
    "Still list a strong second choice on CAPS — departmental quotas can surprise even strong candidates."
  ],
  strong: [
    "Register for Post-UTME promptly — don't wait until the deadline.",
    "Revisit the department's specific admission page for any extra requirements beyond JAMB's minimum.",
    "Prepare a realistic second-choice institution in case of quota changes."
  ],
  moderate: [
    "Register for Post-UTME here, but also apply to at least one of the alternative institutions below.",
    "If a resit is feasible, an improved UTME score is the single highest-leverage move available to you.",
    "Confirm the department's own published cut-off directly — it can sit above or below the general estimate here."
  ],
  low: [
    "Treat the alternatives below as your primary plan, not a backup.",
    "Consider a UTME resit next cycle if the course/institution genuinely matters to you.",
    "Check whether change-of-institution or change-of-course windows are open on your JAMB CAPS profile."
  ],
  very_low: [
    "Address the specific requirement gap above first — it's blocking consideration regardless of score.",
    "If it's a subject-combination issue, check whether IJMB/JUPEB or a change-of-course option fits your timeline.",
    "Speak with the admission office directly — some institutions run condonation or bridging routes for near-miss cases."
  ]
};

/* =========================================================
   Rendering
   ========================================================= */
const app = document.getElementById("app");

function render() {
  app.innerHTML = "";
  if (state.step === 0) app.appendChild(renderLanding());
  else if (state.step >= 1 && state.step <= TOTAL_STEPS) app.appendChild(renderWizardStep(state.step));
  else if (state.step === 6) app.appendChild(renderResults());
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}

function renderProgress(step) {
  const pct = Math.round((step / TOTAL_STEPS) * 100);
  return el("div", { class: "progress-wrap" }, [
    el("div", { class: "progress-label" }, [
      el("span", {}, `Profile check`),
      el("span", { class: "mono" }, `Step ${step} of ${TOTAL_STEPS}`)
    ]),
    el("div", { class: "progress-bar" }, el("div", { class: "progress-fill", style: `width:${pct}%` }))
  ]);
}

function renderLanding() {
  const container = el("div", { class: "screen landing" });

  const hero = el("section", { class: "hero" }, [
    el("p", { class: "eyebrow" }, "NAIJAUNI ADVISOR"),
    el("h1", {}, ["Find out if your score ", el("em", {}, "clears the bar"), " — before JAMB does."]),
    el("p", { class: "hero-sub" }, "Enter your JAMB score, O'Level results, and target course. Get an honest, instant read on your admission chances, real alternatives, and a next-step plan — no false hope, no guesswork."),
    renderCutoffBar(0, 200, "demo"),
    el("div", { class: "hero-actions" }, [
      el("button", { class: "btn btn-primary btn-lg", onclick: startWizard }, "Check my chances →"),
      el("a", { class: "btn btn-ghost btn-lg", href: "cbt-exam.html", target: "_blank", rel: "noopener" }, "Take a CBT practice exam")
    ])
  ]);

  const trust = el("section", { class: "trust-strip" }, [
    trustItem("150", "2026/27 national JAMB minimum for universities"),
    trustItem("30+", "courses with real subject-combination checks"),
    trustItem("Offline-ready", "your instant verdict works with no data")
  ]);

  const how = el("section", { class: "how" }, [
    el("h2", {}, "How this actually works"),
    el("div", { class: "how-grid" }, [
      howCard("01", "Tell us your numbers", "JAMB score, O'Level grades, target course and institution — five short steps."),
      howCard("02", "Get an instant verdict", "A rule-based engine checks your subject combination and score against the institution's real cut-off pattern — right in your browser."),
      howCard("03", "Go deeper if you want", "Optionally ask the AI deep-dive for a current, researched read on department-specific quirks and this year's admission climate.")
    ])
  ]);

  const disclaimer = el("p", { class: "landing-disclaimer" },
    "Built on JAMB's published 2026/2027 national minimums and publicly reported institutional cut-offs. Departmental figures vary and change yearly — always confirm on the institution's official portal before making decisions.");

  container.append(hero, trust, how, disclaimer);
  return container;
}

function trustItem(num, label) {
  return el("div", { class: "trust-item" }, [el("div", { class: "trust-num mono" }, num), el("div", { class: "trust-label" }, label)]);
}
function howCard(num, title, body) {
  return el("div", { class: "how-card" }, [
    el("div", { class: "how-num mono" }, num),
    el("h3", {}, title),
    el("p", {}, body)
  ]);
}

function renderCutoffBar(score, threshold, mode) {
  const max = Math.max(score, threshold) * 1.25 || 100;
  const scorePct = Math.min(100, (score / max) * 100);
  const threshPct = Math.min(100, (threshold / max) * 100);
  const cleared = score >= threshold;
  const wrap = el("div", { class: "cutoff-bar " + (mode === "demo" ? "cutoff-bar-demo" : "") });
  wrap.appendChild(el("div", { class: "cutoff-track" }, [
    el("div", { class: "cutoff-fill " + (cleared ? "cleared" : "short"), style: `width:${scorePct}%` }),
    el("div", { class: "cutoff-mark", style: `left:${threshPct}%` }, el("span", { class: "cutoff-mark-label mono" }, mode === "demo" ? "the bar" : String(threshold)))
  ]));
  if (mode !== "demo") {
    wrap.appendChild(el("div", { class: "cutoff-caption" }, [
      el("span", { class: "mono score-readout" }, String(score)),
      el("span", {}, cleared ? " clears the realistic line" : " sits below the realistic line")
    ]));
  }
  return wrap;
}

function renderWizardStep(step) {
  const container = el("div", { class: "screen wizard" });
  container.appendChild(renderProgress(step));

  const card = el("div", { class: "card step-card" });
  let body, canProceed = () => true;

  if (step === 1) {
    ({ body, canProceed } = stepJambScore());
  } else if (step === 2) {
    ({ body, canProceed } = stepOlevel());
  } else if (step === 3) {
    ({ body, canProceed } = stepCourse());
  } else if (step === 4) {
    ({ body, canProceed } = stepInstitution());
  } else if (step === 5) {
    ({ body, canProceed } = stepCareer());
  }

  card.appendChild(body);

  const nav = el("div", { class: "wizard-nav" }, [
    step > 1 ? el("button", { class: "btn btn-ghost", onclick: () => goStep(step - 1) }, "← Back") : el("span"),
    el("button", {
      class: "btn btn-primary", onclick: () => {
        if (!canProceed()) return;
        saveState();
        if (step === TOTAL_STEPS) { state.result = computeAssessment(); state.step = 6; saveState(); render(); }
        else goStep(step + 1);
      }
    }, step === TOTAL_STEPS ? "See my verdict →" : "Continue →")
  ]);
  card.appendChild(nav);
  container.appendChild(card);
  return container;
}

function goStep(n) { state.step = n; saveState(); render(); }
function startWizard() { state.step = 1; saveState(); render(); }

function stepJambScore() {
  const body = el("div", { class: "step-body" }, [
    el("h2", {}, "What's your JAMB UTME score?"),
    el("p", { class: "step-hint" }, "Your total score out of 400.")
  ]);
  const input = el("input", {
    type: "number", class: "big-input mono", min: "0", max: "400",
    placeholder: "e.g. 245", value: state.jambScore ?? ""
  });
  input.addEventListener("input", () => { state.jambScore = input.value; });
  body.appendChild(input);
  const err = el("p", { class: "field-error" });
  body.appendChild(err);

  return {
    body,
    canProceed: () => {
      const v = Number(state.jambScore);
      if (!state.jambScore || isNaN(v) || v < 0 || v > 400) {
        err.textContent = "Enter a valid score between 0 and 400.";
        return false;
      }
      err.textContent = "";
      return true;
    }
  };
}

function stepOlevel() {
  if (state.olevel.length === 0) {
    state.olevel = [{ subject: "English Language", grade: "" }, { subject: "Mathematics", grade: "" }];
  }
  const body = el("div", { class: "step-body" }, [
    el("h2", {}, "Your O'Level results"),
    el("p", { class: "step-hint" }, "Add every subject with a result — we'll check which are credits (A1–C6).")
  ]);
  const rowsWrap = el("div", { class: "olevel-rows" });
  const err = el("p", { class: "field-error" });

  function renderRows() {
    rowsWrap.innerHTML = "";
    state.olevel.forEach((row, idx) => {
      const subjSel = el("select", { class: "olevel-subject" },
        [el("option", { value: "" }, "Subject…"), ...OLEVEL_SUBJECTS.map(s => el("option", { value: s, ...(row.subject === s ? { selected: "selected" } : {}) }, s))]
      );
      subjSel.value = row.subject;
      subjSel.addEventListener("change", () => { row.subject = subjSel.value; });

      const gradeSel = el("select", { class: "olevel-grade" },
        [el("option", { value: "" }, "Grade…"), ...ALL_GRADES.map(g => el("option", { value: g, ...(row.grade === g ? { selected: "selected" } : {}) }, g))]
      );
      gradeSel.value = row.grade;
      gradeSel.addEventListener("change", () => { row.grade = gradeSel.value; });

      const removeBtn = el("button", {
        class: "row-remove", "aria-label": "Remove subject",
        onclick: () => { state.olevel.splice(idx, 1); renderRows(); }
      }, "×");

      rowsWrap.appendChild(el("div", { class: "olevel-row" }, [subjSel, gradeSel, removeBtn]));
    });
  }
  renderRows();

  const addBtn = el("button", {
    class: "btn btn-ghost btn-sm", onclick: () => {
      if (state.olevel.length >= 9) return;
      state.olevel.push({ subject: "", grade: "" });
      renderRows();
    }
  }, "+ Add subject");

  const sittingsWrap = el("div", { class: "sittings-toggle" }, [
    el("span", { class: "step-hint" }, "Combined from two sittings (WAEC + NECO)?"),
    el("div", { class: "toggle-group" }, [
      el("button", {
        class: "toggle-btn" + (state.sittings === 1 ? " active" : ""),
        onclick: () => { state.sittings = 1; render(); }
      }, "One sitting"),
      el("button", {
        class: "toggle-btn" + (state.sittings === 2 ? " active" : ""),
        onclick: () => { state.sittings = 2; render(); }
      }, "Two sittings")
    ])
  ]);

  body.append(rowsWrap, addBtn, sittingsWrap, err);

  return {
    body,
    canProceed: () => {
      const filled = state.olevel.filter(r => r.subject && r.grade);
      if (filled.length < 5) {
        err.textContent = `Add at least 5 subjects with grades (${filled.length}/5 so far).`;
        return false;
      }
      if (!filled.some(r => r.subject === "English Language")) {
        err.textContent = "English Language is compulsory — add a result for it.";
        return false;
      }
      state.olevel = filled;
      err.textContent = "";
      return true;
    }
  };
}

function stepCourse() {
  const body = el("div", { class: "step-body" }, [
    el("h2", {}, "What course do you want to study?"),
    el("p", { class: "step-hint" }, "Start typing to search — Medicine, Computer Science, Law…")
  ]);
  const err = el("p", { class: "field-error" });
  const combo = createSearchableSelect({
    items: COURSES.slice().sort((a, b) => a.name.localeCompare(b.name)),
    getLabel: c => c.name,
    getSubLabel: c => c.category,
    getId: c => c.id,
    initialId: state.courseId,
    placeholder: "Search for a course…",
    onSelect: (id) => { state.courseId = id; err.textContent = ""; }
  });
  body.append(combo, err);
  return {
    body,
    canProceed: () => {
      if (!state.courseId) { err.textContent = "Pick a course from the list to continue."; return false; }
      return true;
    }
  };
}

function stepInstitution() {
  const body = el("div", { class: "step-body" }, [
    el("h2", {}, "Which institution?"),
    el("p", { class: "step-hint" }, "Search by name — pick \"Other…\" at the bottom of the list if yours isn't shown.")
  ]);
  const err = el("p", { class: "field-error" });
  const combo = createSearchableSelect({
    items: INSTITUTIONS.slice().sort((a, b) => {
      if (a.name.startsWith("Other") !== b.name.startsWith("Other")) return a.name.startsWith("Other") ? 1 : -1;
      return a.name.localeCompare(b.name);
    }),
    getLabel: i => i.name,
    getSubLabel: i => `${i.type.replace("_", " ")}${i.state !== "—" ? " · " + i.state : ""}`,
    getId: i => i.id,
    initialId: state.institutionId,
    placeholder: "Search for a university, polytechnic…",
    onSelect: (id) => { state.institutionId = id; err.textContent = ""; }
  });
  body.append(combo, err);
  return {
    body,
    canProceed: () => {
      if (!state.institutionId) { err.textContent = "Pick an institution from the list to continue."; return false; }
      return true;
    }
  };
}

function stepCareer() {
  const body = el("div", { class: "step-body" }, [
    el("h2", {}, "What are you hoping this leads to?"),
    el("p", { class: "step-hint" }, "A sentence or two is enough — this sharpens your career outlook and the AI deep-dive.")
  ]);
  const textarea = el("textarea", {
    class: "big-textarea", rows: "4",
    placeholder: "e.g. I want to work in tech, ideally remotely for an international company."
  }, state.careerInterests);
  textarea.addEventListener("input", () => { state.careerInterests = textarea.value; });
  body.appendChild(textarea);
  return { body, canProceed: () => true };
}

function renderResults() {
  const r = state.result || computeAssessment();
  const meta = BAND_META[r.band];
  const container = el("div", { class: "screen results" });

  const slip = el("div", { class: "result-slip card" });
  slip.appendChild(el("div", { class: "slip-header" }, [
    el("span", { class: "eyebrow" }, "ADMISSION READ-OUT"),
    el("button", { class: "btn btn-ghost btn-sm", onclick: () => window.print() }, "Print / Save")
  ]));
  slip.appendChild(el("div", { class: "verdict-badge", style: `--badge-color:${meta.color};background:${meta.bg};border-color:${meta.border}` }, [
    el("span", { class: "verdict-label" }, meta.label),
    el("span", { class: "verdict-desc" }, meta.desc)
  ]));
  slip.appendChild(renderCutoffBar(r.score, r.threshold, "results"));

  slip.appendChild(el("div", { class: "profile-grid" }, [
    profileCell("JAMB Score", r.score, true),
    profileCell("O'Level Credits", `${r.creditCount} subject(s)`),
    profileCell("Intended Course", r.course.name),
    profileCell("Intended Institution", r.inst.name)
  ]));
  container.appendChild(slip);

  const assessCard = el("div", { class: "card" }, [
    el("h2", {}, "Admission assessment"),
    el("div", { class: "assess-grid" }, [
      assessColumn("What's working", r.metRequirements, "check"),
      assessColumn("Potential concerns", r.concerns.length ? r.concerns : ["No major concerns identified."], r.concerns.length ? "flag" : "check")
    ])
  ]);
  container.appendChild(assessCard);

  const altCard = el("div", { class: "card" }, [
    el("h2", {}, "Recommended options to widen your odds"),
    el("div", { class: "alt-grid" }, r.alternatives.map(a => el("div", { class: "alt-card" }, [
      el("h3", {}, a.title),
      el("p", {}, a.why)
    ])))
  ]);
  container.appendChild(altCard);

  const o = r.course.outlook;
  const careerCard = el("div", { class: "card career-card" }, [
    el("h2", {}, `Career outlook — ${r.course.name}`),
    el("div", { class: "career-grid" }, [
      careerCell("Market demand", o.demand),
      careerCell("Growth trend", o.growth),
      careerCell("Salary potential", o.salary),
      careerCell("Automation exposure", o.automation)
    ]),
    el("p", { class: "career-note" }, o.note)
  ]);
  container.appendChild(careerCard);

  const planCard = el("div", { class: "card" }, [
    el("h2", {}, "Your next steps"),
    el("ol", { class: "action-plan" }, ACTION_PLANS[r.band].map(step => el("li", {}, step))),
    el("a", { class: "btn btn-ghost cbt-link", href: "cbt-exam.html", target: "_blank", rel: "noopener" }, "Sharpen your score with a CBT practice exam →")
  ]);
  container.appendChild(planCard);

  container.appendChild(renderDeepDiveSection(r));

  container.appendChild(el("p", { class: "landing-disclaimer" },
    "This assessment is a structured estimate, not an admission decision. Departmental cut-offs are set independently by each institution and can change yearly — always confirm current requirements on the institution's official admissions page or JAMB's CAPS portal."));

  container.appendChild(el("button", {
    class: "btn btn-ghost", onclick: () => { state.step = 0; state.result = null; saveState(); render(); }
  }, "← Start a new check"));

  return container;
}

function profileCell(label, value, mono) {
  return el("div", { class: "profile-cell" }, [
    el("div", { class: "profile-cell-label" }, label),
    el("div", { class: "profile-cell-value" + (mono ? " mono" : "") }, String(value))
  ]);
}
function assessColumn(title, items, icon) {
  return el("div", { class: "assess-col" }, [
    el("h3", {}, title),
    el("ul", { class: "assess-list " + icon }, items.map(i => el("li", {}, i)))
  ]);
}
function careerCell(label, value) {
  return el("div", { class: "career-cell" }, [
    el("div", { class: "career-cell-label" }, label),
    el("div", { class: "career-cell-value" }, value)
  ]);
}

function renderDeepDiveSection(r) {
  const wrap = el("div", { class: "card deepdive-card" });
  const header = el("div", { class: "deepdive-header" }, [
    el("div", {}, [
      el("h2", {}, "Want more current detail?"),
      el("p", { class: "step-hint" }, "The AI deep-dive researches this institution and course specifically — recent cut-off news, departmental quirks, and current market context.")
    ])
  ]);
  wrap.appendChild(header);

  const output = el("div", { class: "deepdive-output" });
  const btn = el("button", { class: "btn btn-primary" }, "Get AI deep-dive →");

  btn.addEventListener("click", async () => {
    btn.disabled = true;
    btn.textContent = "Researching…";
    output.innerHTML = "";
    output.appendChild(el("div", { class: "deepdive-loading" }, "Checking current admissions context — this can take up to 30 seconds…"));
    try {
      const res = await fetch("/.netlify/functions/deep-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jambScore: r.score,
          course: r.course.name,
          institution: r.inst.name,
          olevel: state.olevel,
          careerInterests: state.careerInterests,
          ruleBasedBand: BAND_META[r.band].label,
          threshold: r.threshold
        })
      });
      if (!res.ok) throw new Error("Request failed: " + res.status);
      const data = await res.json();
      output.innerHTML = "";
      const textBlock = el("div", { class: "deepdive-text" });
      textBlock.innerHTML = simpleMarkdownToHtml(data.analysis || "No analysis returned.");
      output.appendChild(textBlock);
      btn.remove();
    } catch (e) {
      output.innerHTML = "";
      output.appendChild(el("div", { class: "deepdive-error" },
        "Couldn't reach the deep-dive service right now. This feature needs the site's Anthropic API key to be configured — if you're the site owner, check the Netlify function logs. Your rule-based verdict above is unaffected."));
      btn.disabled = false;
      btn.textContent = "Try again →";
    }
  });

  wrap.appendChild(output);
  wrap.appendChild(btn);
  return wrap;
}

function simpleMarkdownToHtml(md) {
  const escaped = md.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return escaped
    .split(/\n{2,}/)
    .map(block => {
      if (/^\s*[-*]\s+/.test(block)) {
        const items = block.split(/\n/).filter(l => l.trim()).map(l => `<li>${l.replace(/^\s*[-*]\s+/, "")}</li>`).join("");
        return `<ul>${items}</ul>`;
      }
      if (/^###\s+/.test(block)) return `<h4>${block.replace(/^###\s+/, "")}</h4>`;
      if (/^##\s+/.test(block)) return `<h3>${block.replace(/^##\s+/, "")}</h3>`;
      return `<p>${block.replace(/\n/g, "<br>").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")}</p>`;
    })
    .join("");
}

/* ---------- init ---------- */
loadState();
render();

/* ---------- PWA install prompt ---------- */
let deferredInstallPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  const btn = document.getElementById("install-btn");
  if (btn) btn.hidden = false;
});
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("install-btn");
  if (btn) {
    btn.addEventListener("click", async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      btn.hidden = true;
    });
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
