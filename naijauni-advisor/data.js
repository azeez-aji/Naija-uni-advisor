/**
 * NaijaUni Advisor — reference data
 *
 * METHODOLOGY NOTE (read this before touching numbers):
 * Nigerian university admission is NOT decided by JAMB score alone. Most
 * institutions rank candidates by an AGGREGATE score that blends JAMB,
 * Post-UTME screening, and sometimes O'Level grade quality. There is no
 * single universal formula — every institution sets its own weighting via
 * its Senate, and these are published (sometimes inconsistently) on each
 * institution's own admissions portal. Where a specific institution's
 * formula has been publicly corroborated (UNILAG, OAU, UNIBEN, BUK,
 * UNICAL, FUTA, LASU), it's used directly. For every other institution we
 * fall back to the commonly-cited general pattern (50% JAMB / 30%
 * Post-UTME / 20% O'Level for schools that run Post-UTME; 50/50 JAMB +
 * O'Level for schools that don't) — this is explicitly an ESTIMATE, and
 * the app says so in the UI, not just in this comment.
 *
 * JAMB national minimum cut-off marks reflect the 2026/2027 UTME
 * admissions policy meeting. Institution-specific minimums beyond the
 * national floor are publicly reported figures for oversubscribed
 * institutions — these numbers vary across sources year to year (LAUTECH
 * alone was reported as 160, 170, AND 180 across different sites while
 * building this), so treat every number here as "verify on the portal,"
 * never as gospel.
 */

const NATIONAL_MINIMUMS = {
  university: 150,
  nursing_college: 140,
  polytechnic: 100,
  college_of_education: 100
};

// Grade point map for O'Level (WAEC/NECO/NABTEB share this scale) —
// this is also the standard grade-to-point convention several
// institutions (e.g. LASU, UI) use directly in their aggregate formulas.
const GRADE_POINTS = {
  A1: 1, B2: 2, B3: 3, C4: 4, C5: 5, C6: 6,
  D7: 7, E8: 8, F9: 9
};
const CREDIT_GRADES = ["A1", "B2", "B3", "C4", "C5", "C6"];
const ALL_GRADES = ["A1", "B2", "B3", "C4", "C5", "C6", "D7", "E8", "F9"];

const OLEVEL_SUBJECTS = [
  "English Language", "Mathematics", "Physics", "Chemistry", "Biology",
  "Agricultural Science", "Economics", "Geography", "Government",
  "History", "Literature in English", "CRS/CRK", "IRS/IRK",
  "Commerce", "Accounting/Book-keeping", "Further Mathematics",
  "Computer Studies", "Fine Art", "French", "Hausa", "Igbo", "Yoruba",
  "Technical Drawing", "Food and Nutrition", "Civic Education"
];

// Converts a set of O'Level {subject, grade} records into a 0-100
// "O'Level strength" percentage, using the best 5 credited subjects
// (prioritising ones required by the course, then the next-best grades).
// A1-heavy profile -> close to 100%. All-C6 profile -> ~40%. This is a
// simplified, documented convention — not an official points table.
function computeOlevelStrength(olevelRecords, course) {
  const priority = new Set([...(course.required || []), ...(course.oneOf || []), "English Language"]);
  const credited = olevelRecords
    .filter(r => CREDIT_GRADES.includes(r.grade))
    .map(r => ({ ...r, point: GRADE_POINTS[r.grade], isPriority: priority.has(r.subject) }))
    .sort((a, b) => (a.isPriority === b.isPriority ? a.point - b.point : a.isPriority ? -1 : 1));
  const best5 = credited.slice(0, 5);
  if (best5.length === 0) return 0;
  const avgPoint = best5.reduce((s, r) => s + r.point, 0) / best5.length;
  // avgPoint 1 (all A1) -> 100%, avgPoint 6 (all C6) -> 40%
  const pct = 100 - ((avgPoint - 1) / 5) * 60;
  return Math.max(0, Math.min(100, Math.round(pct)));
}


// competitiveness tier drives the "realistic score" bonus added on
// top of an institution's own minimum cut-off.
// tier 5 = ultra-competitive ... tier 1 = accessible
const COURSES = [
  { id: "medicine", name: "Medicine & Surgery", category: "Medical", tier: 5,
    required: ["English Language", "Biology", "Chemistry", "Physics"],
    outlook: { demand: "Very high", growth: "Stable, structurally undersupplied in Nigeria",
      salary: "High locally; very high abroad via licensing (UK PLAB, US USMLE, etc.)",
      automation: "Low exposure — hands-on clinical work is hard to automate",
      note: "The bottleneck isn't jobs, it's training capacity — house-jobs and residency slots are limited." } },
  { id: "dentistry", name: "Dentistry", category: "Medical", tier: 5,
    required: ["English Language", "Biology", "Chemistry", "Physics"],
    outlook: { demand: "High", growth: "Steady", salary: "High",
      automation: "Low", note: "Fewer training seats nationally than Medicine, so competition per seat is often sharper." } },
  { id: "pharmacy", name: "Pharmacy", category: "Medical", tier: 5,
    required: ["English Language", "Biology", "Chemistry", "Physics"],
    outlook: { demand: "High", growth: "Growing with local drug-manufacturing push",
      salary: "Good, strong in hospital/industrial pharmacy and entrepreneurship (community pharmacy ownership)",
      automation: "Low", note: "Clinical and industrial pharmacy tracks diverge early — worth deciding direction." } },
  { id: "nursing", name: "Nursing Science", category: "Medical", tier: 4,
    required: ["English Language", "Chemistry", "Biology", "Physics"],
    outlook: { demand: "Very high", growth: "Strong international demand (UK, US, Canada, Gulf) is pulling graduates abroad",
      salary: "Modest locally, high abroad", automation: "Low",
      note: "One of the strongest global-mobility courses on this list right now." } },
  { id: "med_lab_science", name: "Medical Laboratory Science", category: "Medical", tier: 4,
    required: ["English Language", "Chemistry", "Biology", "Physics"],
    outlook: { demand: "High", growth: "Steady, tied to healthcare system expansion",
      salary: "Moderate", automation: "Moderate — automated analysers change the day-to-day role",
      note: "Diagnostics is professionalising fast; postgraduate specialisation adds real value." } },
  { id: "physiotherapy", name: "Physiotherapy", category: "Medical", tier: 4,
    required: ["English Language", "Biology", "Chemistry", "Physics"],
    outlook: { demand: "Growing", growth: "Rising with aging population and sports medicine",
      salary: "Moderate to good", automation: "Low", note: "Still under-supplied relative to need in most states." } },
  { id: "law", name: "Law (LL.B)", category: "Law", tier: 5,
    required: ["English Language", "Literature in English"], oneOf: ["Government", "History", "CRS/CRK", "IRS/IRK"],
    outlook: { demand: "High but saturated at entry level", growth: "Corporate, tech, and compliance law growing fastest",
      salary: "Wide range — modest in litigation, strong in corporate/oil & gas practice",
      automation: "Moderate — document review is being automated, advisory work isn't",
      note: "Law School (Nigerian Law School) after your degree is a second hurdle — factor that into the timeline." } },
  { id: "mass_comm", name: "Mass Communication", category: "Social Science", tier: 4,
    required: ["English Language", "Literature in English"], oneOf: ["Government", "Economics"],
    outlook: { demand: "Moderate, shifting fast", growth: "Digital media, content strategy and PR are growing; traditional broadcast is shrinking",
      salary: "Wide range, strongest for those who build a portfolio/brand", automation: "Moderate",
      note: "Outcomes here depend heavily on a personal portfolio, not just the certificate." } },
  { id: "computer_science", name: "Computer Science", category: "Science", tier: 4,
    required: ["English Language", "Mathematics", "Physics"], oneOf: ["Chemistry", "Biology", "Agricultural Science", "Economics", "Geography"],
    outlook: { demand: "Very high", growth: "Strongest growth area in the Nigerian job market, plus remote/global opportunities",
      salary: "Wide range locally, high via remote international work", automation: "Mixed — AI changes the job, doesn't remove it",
      note: "What you build outside the classroom (projects, internships) usually matters more than the CGPA here." } },
  { id: "software_eng", name: "Software Engineering", category: "Science", tier: 4,
    required: ["English Language", "Mathematics", "Physics"], oneOf: ["Chemistry", "Biology", "Economics", "Geography"],
    outlook: { demand: "Very high", growth: "Strong, especially product/backend roles",
      salary: "Wide range, strong via remote work", automation: "Mixed", note: "Similar profile to Computer Science with more emphasis on engineering practice." } },
  { id: "accounting", name: "Accounting", category: "Management", tier: 4,
    required: ["English Language", "Mathematics", "Economics"], oneOf: ["Government", "Commerce", "Geography", "Accounting/Book-keeping"],
    outlook: { demand: "High, evergreen", growth: "Stable, professional certification (ICAN/ACCA) multiplies value",
      salary: "Moderate to high with certification", automation: "Moderate — routine bookkeeping automates, advisory/audit judgment doesn't",
      note: "Pair the degree with ICAN or ACCA — that's what actually moves salary bands." } },
  { id: "banking_finance", name: "Banking and Finance", category: "Management", tier: 3,
    required: ["English Language", "Mathematics", "Economics"], oneOf: ["Government", "Commerce", "Geography"],
    outlook: { demand: "High", growth: "Fintech is reshaping the sector faster than traditional banking is growing",
      salary: "Moderate to good", automation: "Moderate", note: "Fintech/data skills on top of the degree are increasingly the differentiator." } },
  { id: "economics", name: "Economics", category: "Social Science", tier: 3,
    required: ["English Language", "Mathematics", "Economics"],
    outlook: { demand: "Moderate to high", growth: "Strong for those who pair it with data/quant skills",
      salary: "Wide range", automation: "Low for analysis/policy roles", note: "Very flexible degree — policy, banking, research, or further study all open." } },
  { id: "business_admin", name: "Business Administration", category: "Management", tier: 2,
    required: ["English Language", "Mathematics"], oneOf: ["Economics", "Government", "Commerce", "Accounting/Book-keeping"],
    outlook: { demand: "Moderate", growth: "Steady but generalist — outcomes vary widely by specialisation and internships",
      salary: "Wide range", automation: "Low to moderate", note: "Consider pairing with a specialisation (marketing, HR, operations) rather than staying generalist." } },
  { id: "civil_eng", name: "Civil Engineering", category: "Engineering", tier: 4,
    required: ["English Language", "Mathematics", "Physics", "Chemistry"],
    outlook: { demand: "High", growth: "Tied to infrastructure spending — cyclical but persistent demand",
      salary: "Good, especially with COREN certification and site experience",
      automation: "Low for site/project work", note: "COREN registration after NYSC is what unlocks senior/contracting roles." } },
  { id: "electrical_eng", name: "Electrical/Electronic Engineering", category: "Engineering", tier: 4,
    required: ["English Language", "Mathematics", "Physics", "Chemistry"],
    outlook: { demand: "High", growth: "Power sector reform and renewables are creating new demand",
      salary: "Good", automation: "Moderate", note: "Renewable energy and telecoms are the fastest-growing niches right now." } },
  { id: "mechanical_eng", name: "Mechanical Engineering", category: "Engineering", tier: 4,
    required: ["English Language", "Mathematics", "Physics", "Chemistry"],
    outlook: { demand: "High", growth: "Steady, strong in oil & gas and manufacturing",
      salary: "Good", automation: "Moderate", note: "Oil & gas still dominates the highest-paying entry roles." } },
  { id: "petroleum_eng", name: "Petroleum Engineering", category: "Engineering", tier: 5,
    required: ["English Language", "Mathematics", "Physics", "Chemistry"],
    outlook: { demand: "High but cyclical", growth: "Tied to oil price cycles; energy-transition roles are an emerging alternative",
      salary: "Very high when hired into major operators", automation: "Low for field roles",
      note: "Historically one of the highest cut-offs in the country — hiring itself is also cyclical with oil prices." } },
  { id: "mechatronics_eng", name: "Mechatronics Engineering", category: "Engineering", tier: 4,
    required: ["English Language", "Mathematics", "Physics", "Chemistry"],
    outlook: { demand: "Growing", growth: "Robotics/automation demand is rising, still a small field locally",
      salary: "Good", automation: "Low — this field builds automation rather than being replaced by it",
      note: "Fewer programmes offer this, so competition for available seats can be sharp even if the field is small." } },
  { id: "architecture", name: "Architecture", category: "Environmental Sciences", tier: 4,
    required: ["English Language", "Mathematics", "Physics"], oneOf: ["Chemistry", "Geography", "Fine Art", "Biology"],
    outlook: { demand: "Moderate", growth: "Tied to real estate/construction cycles",
      salary: "Moderate, improves significantly with ARCON registration and own practice",
      automation: "Moderate — drafting automates, design judgment doesn't", note: "A 5-year programme; factor the longer runway into planning." } },
  { id: "biochemistry", name: "Biochemistry", category: "Science", tier: 3,
    required: ["English Language", "Chemistry", "Biology"], oneOf: ["Physics", "Mathematics"],
    outlook: { demand: "Moderate", growth: "Research and pharma-adjacent roles growing slowly",
      salary: "Moderate", automation: "Low for lab/research roles",
      note: "Strongest outcomes usually come with postgraduate specialisation or a pivot into health-adjacent industry roles." } },
  { id: "microbiology", name: "Microbiology", category: "Science", tier: 3,
    required: ["English Language", "Chemistry", "Biology"], oneOf: ["Physics", "Mathematics"],
    outlook: { demand: "Moderate", growth: "Food safety, brewing, and public health labs are steady employers",
      salary: "Moderate", automation: "Low", note: "Industrial microbiology (breweries, food/beverage QC) often pays better than research routes." } },
  { id: "physics", name: "Physics", category: "Science", tier: 2,
    required: ["English Language", "Mathematics", "Physics"],
    outlook: { demand: "Moderate", growth: "Strong for those who pivot into data/engineering-adjacent roles",
      salary: "Wide range", automation: "Low for research", note: "A physics degree is a strong springboard into data science or engineering postgrad routes." } },
  { id: "chemistry", name: "Chemistry", category: "Science", tier: 2,
    required: ["English Language", "Mathematics", "Chemistry"], oneOf: ["Physics", "Biology"],
    outlook: { demand: "Moderate", growth: "Steady in oil & gas QC, manufacturing, education",
      salary: "Moderate", automation: "Low to moderate", note: "Industrial chemistry roles often out-earn pure academic routes." } },
  { id: "political_science", name: "Political Science", category: "Social Science", tier: 2,
    required: ["English Language", "Government"], oneOf: ["History", "Economics", "Geography"],
    outlook: { demand: "Moderate", growth: "Public policy, NGOs, and international development are steady employers",
      salary: "Wide range", automation: "Low", note: "Strong base for law conversion, civil service, or NGO/development careers." } },
  { id: "psychology", name: "Psychology", category: "Social Science", tier: 3,
    required: ["English Language"], oneOf: ["Biology", "Chemistry", "Economics", "Government", "Mathematics"],
    outlook: { demand: "Growing", growth: "Rising awareness of mental health is opening clinical and organisational roles",
      salary: "Moderate, improves with postgraduate clinical training", automation: "Low",
      note: "An undergraduate psychology degree alone is a foundation — postgraduate training unlocks clinical practice." } },
  { id: "sociology", name: "Sociology", category: "Social Science", tier: 2,
    required: ["English Language"], oneOf: ["Government", "Economics", "History", "Geography"],
    outlook: { demand: "Moderate", growth: "NGO, research, and HR-adjacent roles", salary: "Moderate",
      automation: "Low", note: "Often strongest when paired with a professional HR or M&E certification." } },
  { id: "education_generic", name: "Education (any subject specialty)", category: "Education", tier: 1,
    required: ["English Language"],
    outlook: { demand: "High structurally (teacher shortages persist)", growth: "Steady public-sector demand; private-school and edtech roles growing",
      salary: "Modest in public schools, better in private/international schools",
      automation: "Low", note: "TRCN registration is expected; specialising in Maths, English, or Sciences tends to have the best job security." } },
  { id: "agriculture", name: "Agricultural Science / Agric Economics", category: "Agriculture", tier: 2,
    required: ["English Language", "Chemistry"], oneOf: ["Biology", "Agricultural Science", "Physics", "Mathematics", "Economics", "Geography"],
    outlook: { demand: "High structurally", growth: "Agribusiness and agri-tech are attracting real investment",
      salary: "Wide range, strong in agribusiness/export value chains", automation: "Moderate for large-scale operations",
      note: "The strongest outcomes are usually in agribusiness/value-chain roles, not subsistence-adjacent paths." } },
  { id: "library_science", name: "Library and Information Science", category: "Education", tier: 1,
    required: ["English Language"], oneOf: ["Government", "Economics", "History", "Geography"],
    outlook: { demand: "Modest", growth: "Shifting toward digital knowledge-management and archiving roles",
      salary: "Modest", automation: "Moderate", note: "Digital archiving/records-management skills widen options beyond traditional libraries." } },
  { id: "geography", name: "Geography", category: "Science", tier: 2,
    required: ["English Language", "Geography"], oneOf: ["Mathematics", "Economics", "Physics"],
    outlook: { demand: "Moderate", growth: "GIS and remote-sensing skills are the growth edge here",
      salary: "Moderate, higher with GIS specialisation", automation: "Moderate",
      note: "Add a GIS/remote-sensing certification — it meaningfully changes the job pool available to you." } },
  { id: "international_relations", name: "International Relations", category: "Social Science", tier: 3,
    required: ["English Language", "Government"], oneOf: ["History", "Economics", "Geography"],
    outlook: { demand: "Moderate", growth: "Diplomacy roles are limited; NGO/development/private-sector policy roles growing",
      salary: "Wide range", automation: "Low", note: "Very few graduates end up in diplomatic postings — plan for NGO/corporate policy routes too." } }
];

// Course competitiveness tier -> baseline "realistic aggregate %" needed,
// before any institution prestige adjustment. Calibrated against publicly
// reported patterns (e.g. OAU Medicine trending ~68%+ aggregate per its
// own published formula; general engineering guidance citing 65-75%
// aggregate as competitive). This is expressed as a percentage of each
// institution's own aggregate scale, so it works whether or not
// Post-UTME is part of that scale.
const AGGREGATE_BASE = 38;
const TIER_INCREMENT = { 1: 0, 2: 6, 3: 14, 4: 22, 5: 30 };
const PRESTIGE_POINTS = 6; // extra aggregate % per prestige tier above baseline

function tierThreshold(tier, prestige) {
  return AGGREGATE_BASE + TIER_INCREMENT[tier] + (prestige - 1) * PRESTIGE_POINTS;
}

// Default aggregate weightings, used unless an institution has a
// specifically corroborated formula (see formulaConfidence below).
const DEFAULT_WEIGHTS_WITH_PUTME = { jamb: 0.5, postUtme: 0.3, olevel: 0.2 };
const DEFAULT_WEIGHTS_NO_PUTME = { jamb: 0.5, postUtme: 0, olevel: 0.5 };
const DEFAULT_WEIGHTS_JAMB_ONLY = { jamb: 1, postUtme: 0, olevel: 0 };

function weightsFor(inst) {
  if (inst.weights) return inst.weights;
  if (!inst.hasPostUTME) return inst.jambOnly ? DEFAULT_WEIGHTS_JAMB_ONLY : DEFAULT_WEIGHTS_NO_PUTME;
  return DEFAULT_WEIGHTS_WITH_PUTME;
}

// formulaConfidence: "verified" = specific formula corroborated by the
// institution's own published Post-UTME/admission guide at build time.
// "estimated" = using the general pattern above; this institution's
// actual formula has not been independently confirmed.
const INSTITUTIONS = [
  // ---- Federal universities (specifically verified formulas) ----
  { id: "unilag", name: "University of Lagos (UNILAG)", type: "federal", state: "Lagos", minCutoff: 200, prestige: 2, hasPostUTME: true, weights: { jamb: 0.5, postUtme: 0.5, olevel: 0 }, formulaConfidence: "verified" },
  { id: "oau", name: "Obafemi Awolowo University (OAU)", type: "federal", state: "Osun", minCutoff: 200, prestige: 2, hasPostUTME: true, weights: { jamb: 0.5, postUtme: 0.4, olevel: 0.1 }, formulaConfidence: "verified" },
  { id: "uniben", name: "University of Benin (UNIBEN)", type: "federal", state: "Edo", minCutoff: 200, prestige: 2, hasPostUTME: true, weights: { jamb: 0.5, postUtme: 0.5, olevel: 0 }, formulaConfidence: "verified" },
  { id: "buk", name: "Bayero University Kano (BUK)", type: "federal", state: "Kano", minCutoff: 150, prestige: 1, hasPostUTME: true, weights: { jamb: 0.5, postUtme: 0.5, olevel: 0 }, formulaConfidence: "verified" },
  { id: "unical", name: "University of Calabar (UNICAL)", type: "federal", state: "Cross River", minCutoff: 150, prestige: 1, hasPostUTME: true, weights: { jamb: 0.5, postUtme: 0.5, olevel: 0 }, formulaConfidence: "verified" },
  { id: "futa", name: "Federal University of Technology, Akure (FUTA)", type: "federal", state: "Ondo", minCutoff: 200, prestige: 1, hasPostUTME: false, weights: { jamb: 0.5, postUtme: 0, olevel: 0.5 }, formulaConfidence: "verified" },

  // ---- Federal universities (general estimate formula) ----
  { id: "ui", name: "University of Ibadan (UI)", type: "federal", state: "Oyo", minCutoff: 200, prestige: 2, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "unn", name: "University of Nigeria, Nsukka (UNN)", type: "federal", state: "Enugu", minCutoff: 200, prestige: 2, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "abu_zaria", name: "Ahmadu Bello University (ABU), Zaria", type: "federal", state: "Kaduna", minCutoff: 150, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "unilorin", name: "University of Ilorin (UNILORIN)", type: "federal", state: "Kwara", minCutoff: 150, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "futminna", name: "Federal University of Technology, Minna (FUTMINNA)", type: "federal", state: "Niger", minCutoff: 150, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "uniport", name: "University of Port Harcourt (UNIPORT)", type: "federal", state: "Rivers", minCutoff: 150, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "unizik", name: "Nnamdi Azikiwe University (UNIZIK)", type: "federal", state: "Anambra", minCutoff: 150, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "unijos", name: "University of Jos (UNIJOS)", type: "federal", state: "Plateau", minCutoff: 150, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "unimaid", name: "University of Maiduguri (UNIMAID)", type: "federal", state: "Borno", minCutoff: 150, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "udus", name: "Usmanu Danfodiyo University, Sokoto (UDUS)", type: "federal", state: "Sokoto", minCutoff: 150, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "funaab", name: "Federal University of Agriculture, Abeokuta (FUNAAB)", type: "federal", state: "Ogun", minCutoff: 150, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "futo", name: "Federal University of Technology, Owerri (FUTO)", type: "federal", state: "Imo", minCutoff: 150, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "uniuyo", name: "University of Uyo (UNIUYO)", type: "federal", state: "Akwa Ibom", minCutoff: 150, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "fuoye", name: "Federal University, Oye-Ekiti (FUOYE)", type: "federal", state: "Ekiti", minCutoff: 150, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "fulafia", name: "Federal University, Lafia (FULAFIA)", type: "federal", state: "Nasarawa", minCutoff: 150, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "fud", name: "Federal University, Dutse (FUD)", type: "federal", state: "Jigawa", minCutoff: 150, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "fudma", name: "Federal University, Dutsin-Ma (FUDMA)", type: "federal", state: "Katsina", minCutoff: 150, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "fukashere", name: "Federal University, Kashere (FUKASHERE)", type: "federal", state: "Gombe", minCutoff: 150, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "fugus", name: "Federal University, Gusau (FUGUS)", type: "federal", state: "Zamfara", minCutoff: 150, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "fulokoja", name: "Federal University, Lokoja (FULOKOJA)", type: "federal", state: "Kogi", minCutoff: 150, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "fuotuoke", name: "Federal University, Otuoke (FUOTUOKE)", type: "federal", state: "Bayelsa", minCutoff: 150, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "fuwukari", name: "Federal University Wukari (FUWUKARI)", type: "federal", state: "Taraba", minCutoff: 150, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "aefunai", name: "Alex Ekwueme Federal University, Ndufu-Alike (AE-FUNAI)", type: "federal", state: "Ebonyi", minCutoff: 150, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "mau", name: "Modibbo Adama University, Yola (MAU)", type: "federal", state: "Adamawa", minCutoff: 150, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "mouau", name: "Michael Okpara University of Agriculture, Umudike (MOUAU)", type: "federal", state: "Abia", minCutoff: 150, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "atbu", name: "Abubakar Tafawa Balewa University, Bauchi (ATBU)", type: "federal", state: "Bauchi", minCutoff: 150, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "fubk", name: "Federal University, Birnin Kebbi (FUBK)", type: "federal", state: "Kebbi", minCutoff: 150, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "nda", name: "Nigerian Defence Academy (NDA)", type: "federal", state: "Kaduna", minCutoff: 180, prestige: 2, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "noun", name: "National Open University of Nigeria (NOUN)", type: "federal", state: "Lagos (HQ, nationwide study centres)", minCutoff: 150, prestige: 1, hasPostUTME: false, jambOnly: true, formulaConfidence: "estimated" },

  // ---- State universities ----
  { id: "lasu", name: "Lagos State University (LASU)", type: "state", state: "Lagos", minCutoff: 195, prestige: 1, hasPostUTME: false, weights: { jamb: 0.6, postUtme: 0, olevel: 0.4 }, formulaConfidence: "verified" },
  { id: "lasustech", name: "Lagos State University of Science and Technology (LASUSTECH)", type: "state", state: "Lagos", minCutoff: 195, prestige: 1, hasPostUTME: false, weights: { jamb: 0.6, postUtme: 0, olevel: 0.4 }, formulaConfidence: "estimated" },
  { id: "lasue", name: "Lagos State University of Education (LASUED)", type: "state", state: "Lagos", minCutoff: 185, prestige: 1, hasPostUTME: false, weights: { jamb: 0.6, postUtme: 0, olevel: 0.4 }, formulaConfidence: "estimated" },
  { id: "lautech", name: "Ladoke Akintola University of Technology (LAUTECH)", type: "state", state: "Oyo", minCutoff: 170, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "oou", name: "Olabisi Onabanjo University (OOU)", type: "state", state: "Ogun", minCutoff: 150, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "eksu", name: "Ekiti State University (EKSU)", type: "state", state: "Ekiti", minCutoff: 150, prestige: 1, hasPostUTME: false, formulaConfidence: "estimated" },
  { id: "rsu", name: "Rivers State University (RSU)", type: "state", state: "Rivers", minCutoff: 150, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "delsu", name: "Delta State University, Abraka (DELSU)", type: "state", state: "Delta", minCutoff: 150, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "esut", name: "Enugu State University of Science and Technology (ESUT)", type: "state", state: "Enugu", minCutoff: 150, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "imsu", name: "Imo State University (IMSU)", type: "state", state: "Imo", minCutoff: 150, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "absu", name: "Abia State University (ABSU)", type: "state", state: "Abia", minCutoff: 150, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "aau_ekpoma", name: "Ambrose Alli University, Ekpoma (AAU)", type: "state", state: "Edo", minCutoff: 150, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "paau", name: "Prince Abubakar Audu University (formerly Kogi State University)", type: "state", state: "Kogi", minCutoff: 150, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "bsu", name: "Benue State University (BSU)", type: "state", state: "Benue", minCutoff: 150, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "kasu", name: "Kaduna State University (KASU)", type: "state", state: "Kaduna", minCutoff: 150, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "kustwudil", name: "Kano University of Science and Technology, Wudil (KUST)", type: "state", state: "Kano", minCutoff: 150, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "nsuk", name: "Nasarawa State University, Keffi (NSUK)", type: "state", state: "Nasarawa", minCutoff: 150, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "aaua", name: "Adekunle Ajasin University, Akungba (AAUA)", type: "state", state: "Ondo", minCutoff: 150, prestige: 1, hasPostUTME: false, formulaConfidence: "estimated" },
  { id: "uniosun", name: "Osun State University (UNIOSUN)", type: "state", state: "Osun", minCutoff: 150, prestige: 1, hasPostUTME: false, formulaConfidence: "estimated" },
  { id: "osustech", name: "Ondo State University of Science and Technology (OSUSTECH)", type: "state", state: "Ondo", minCutoff: 150, prestige: 1, hasPostUTME: false, formulaConfidence: "estimated" },
  { id: "aksu", name: "Akwa Ibom State University (AKSU)", type: "state", state: "Akwa Ibom", minCutoff: 150, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "ebsu", name: "Ebonyi State University (EBSU)", type: "state", state: "Ebonyi", minCutoff: 150, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "crutech", name: "Cross River State University of Technology (CRUTECH)", type: "state", state: "Cross River", minCutoff: 150, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "ndu", name: "Niger Delta University (NDU)", type: "state", state: "Bayelsa", minCutoff: 150, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "plasu", name: "Plateau State University, Bokkos (PLASU)", type: "state", state: "Plateau", minCutoff: 150, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "tsu", name: "Taraba State University (TSU)", type: "state", state: "Taraba", minCutoff: 150, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "ssu_sokoto", name: "Sokoto State University (SSU)", type: "state", state: "Sokoto", minCutoff: 150, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },

  // ---- Private universities (mostly JAMB + minimum threshold, per common reporting) ----
  { id: "pan_atlantic", name: "Pan-Atlantic University", type: "private", state: "Lagos", minCutoff: 220, prestige: 2, hasPostUTME: false, jambOnly: true, formulaConfidence: "estimated" },
  { id: "covenant", name: "Covenant University", type: "private", state: "Ogun", minCutoff: 200, prestige: 2, hasPostUTME: false, jambOnly: true, formulaConfidence: "estimated" },
  { id: "abuad", name: "Afe Babalola University (ABUAD)", type: "private", state: "Ekiti", minCutoff: 180, prestige: 2, hasPostUTME: false, jambOnly: true, formulaConfidence: "estimated" },
  { id: "babcock", name: "Babcock University", type: "private", state: "Ogun", minCutoff: 180, prestige: 2, hasPostUTME: false, jambOnly: true, formulaConfidence: "estimated" },
  { id: "landmark", name: "Landmark University", type: "private", state: "Kwara", minCutoff: 180, prestige: 1, hasPostUTME: false, jambOnly: true, formulaConfidence: "estimated" },
  { id: "bowen", name: "Bowen University", type: "private", state: "Osun", minCutoff: 160, prestige: 1, hasPostUTME: false, jambOnly: true, formulaConfidence: "estimated" },
  { id: "bells", name: "Bells University of Technology", type: "private", state: "Ogun", minCutoff: 150, prestige: 1, hasPostUTME: false, jambOnly: true, formulaConfidence: "estimated" },
  { id: "run", name: "Redeemer's University (RUN)", type: "private", state: "Osun", minCutoff: 160, prestige: 1, hasPostUTME: false, jambOnly: true, formulaConfidence: "estimated" },
  { id: "leadcity", name: "Lead City University", type: "private", state: "Oyo", minCutoff: 150, prestige: 1, hasPostUTME: false, jambOnly: true, formulaConfidence: "estimated" },
  { id: "aun", name: "American University of Nigeria (AUN)", type: "private", state: "Adamawa", minCutoff: 180, prestige: 2, hasPostUTME: false, jambOnly: true, formulaConfidence: "estimated" },
  { id: "nileuni", name: "Nile University of Nigeria", type: "private", state: "FCT Abuja", minCutoff: 160, prestige: 1, hasPostUTME: false, jambOnly: true, formulaConfidence: "estimated" },
  { id: "caleb", name: "Caleb University", type: "private", state: "Lagos", minCutoff: 150, prestige: 1, hasPostUTME: false, jambOnly: true, formulaConfidence: "estimated" },

  // ---- Polytechnics (federal + state) ----
  { id: "yabatech", name: "Yaba College of Technology (YABATECH)", type: "polytechnic", state: "Lagos", minCutoff: 100, prestige: 1, hasPostUTME: false, formulaConfidence: "estimated" },
  { id: "lagospoly", name: "Lagos State Polytechnic (LASPOTECH)", type: "polytechnic", state: "Lagos", minCutoff: 100, prestige: 1, hasPostUTME: false, formulaConfidence: "estimated" },
  { id: "kwarapoly", name: "Kwara State Polytechnic", type: "polytechnic", state: "Kwara", minCutoff: 100, prestige: 1, hasPostUTME: false, formulaConfidence: "estimated" },
  { id: "fedpolynekede", name: "Federal Polytechnic, Nekede", type: "polytechnic", state: "Imo", minCutoff: 100, prestige: 1, hasPostUTME: false, formulaConfidence: "estimated" },
  { id: "fedpolyilaro", name: "Federal Polytechnic, Ilaro", type: "polytechnic", state: "Ogun", minCutoff: 100, prestige: 1, hasPostUTME: false, formulaConfidence: "estimated" },
  { id: "fedpolyede", name: "Federal Polytechnic, Ede", type: "polytechnic", state: "Osun", minCutoff: 100, prestige: 1, hasPostUTME: false, formulaConfidence: "estimated" },
  { id: "fedpolynasarawa", name: "Federal Polytechnic, Nasarawa", type: "polytechnic", state: "Nasarawa", minCutoff: 100, prestige: 1, hasPostUTME: false, formulaConfidence: "estimated" },
  { id: "fedpolybida", name: "Federal Polytechnic, Bida", type: "polytechnic", state: "Niger", minCutoff: 100, prestige: 1, hasPostUTME: false, formulaConfidence: "estimated" },
  { id: "fedpolyoko", name: "Federal Polytechnic, Oko", type: "polytechnic", state: "Anambra", minCutoff: 100, prestige: 1, hasPostUTME: false, formulaConfidence: "estimated" },
  { id: "polyibadan", name: "The Polytechnic, Ibadan", type: "polytechnic", state: "Oyo", minCutoff: 100, prestige: 1, hasPostUTME: false, formulaConfidence: "estimated" },
  { id: "kadpoly", name: "Kaduna Polytechnic (KADPOLY)", type: "polytechnic", state: "Kaduna", minCutoff: 100, prestige: 1, hasPostUTME: false, formulaConfidence: "estimated" },
  { id: "auchipoly", name: "Auchi Polytechnic", type: "polytechnic", state: "Edo", minCutoff: 100, prestige: 1, hasPostUTME: false, formulaConfidence: "estimated" },
  { id: "rugipo", name: "Rufus Giwa Polytechnic, Owo", type: "polytechnic", state: "Ondo", minCutoff: 100, prestige: 1, hasPostUTME: false, formulaConfidence: "estimated" },
  { id: "fedpolyoffa", name: "Federal Polytechnic, Offa", type: "polytechnic", state: "Kwara", minCutoff: 100, prestige: 1, hasPostUTME: false, formulaConfidence: "estimated" },

  // ---- Colleges of Education (federal + state) ----
  { id: "fcezaria", name: "Federal College of Education, Zaria", type: "college_of_education", state: "Kaduna", minCutoff: 100, prestige: 1, hasPostUTME: false, formulaConfidence: "estimated" },
  { id: "fcetakoka", name: "Federal College of Education (Technical), Akoka", type: "college_of_education", state: "Lagos", minCutoff: 100, prestige: 1, hasPostUTME: false, formulaConfidence: "estimated" },
  { id: "fceabeokuta", name: "Federal College of Education, Abeokuta", type: "college_of_education", state: "Ogun", minCutoff: 100, prestige: 1, hasPostUTME: false, formulaConfidence: "estimated" },
  { id: "fcekano", name: "Federal College of Education, Kano", type: "college_of_education", state: "Kano", minCutoff: 100, prestige: 1, hasPostUTME: false, formulaConfidence: "estimated" },
  { id: "fceokene", name: "Federal College of Education, Okene", type: "college_of_education", state: "Kogi", minCutoff: 100, prestige: 1, hasPostUTME: false, formulaConfidence: "estimated" },
  { id: "alvanikoku", name: "Alvan Ikoku Federal College of Education, Owerri", type: "college_of_education", state: "Imo", minCutoff: 100, prestige: 1, hasPostUTME: false, formulaConfidence: "estimated" },
  { id: "fcekontagora", name: "Federal College of Education, Kontagora", type: "college_of_education", state: "Niger", minCutoff: 100, prestige: 1, hasPostUTME: false, formulaConfidence: "estimated" },
  { id: "mocped", name: "Michael Otedola College of Primary Education (MOCPED)", type: "college_of_education", state: "Lagos", minCutoff: 100, prestige: 1, hasPostUTME: false, formulaConfidence: "estimated" },
  { id: "oscelanlate", name: "Oyo State College of Education, Lanlate", type: "college_of_education", state: "Oyo", minCutoff: 100, prestige: 1, hasPostUTME: false, formulaConfidence: "estimated" },
  { id: "osceilaorangun", name: "Osun State College of Education, Ila-Orangun", type: "college_of_education", state: "Osun", minCutoff: 100, prestige: 1, hasPostUTME: false, formulaConfidence: "estimated" },

  // ---- Catch-all fallbacks for institutions not individually listed ----
  { id: "other_federal", name: "Other Federal University (not listed)", type: "federal", state: "—", minCutoff: null, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "other_state", name: "Other State University (not listed)", type: "state", state: "—", minCutoff: null, prestige: 1, hasPostUTME: true, formulaConfidence: "estimated" },
  { id: "other_private", name: "Other Private University (not listed)", type: "private", state: "—", minCutoff: null, prestige: 2, hasPostUTME: false, jambOnly: true, formulaConfidence: "estimated" },
  { id: "other_poly", name: "Other Polytechnic (not listed)", type: "polytechnic", state: "—", minCutoff: null, prestige: 1, hasPostUTME: false, formulaConfidence: "estimated" },
  { id: "other_coe", name: "Other College of Education (not listed)", type: "college_of_education", state: "—", minCutoff: null, prestige: 1, hasPostUTME: false, formulaConfidence: "estimated" },
  { id: "other_nursing", name: "Other College of Nursing (not listed)", type: "nursing_college", state: "—", minCutoff: null, prestige: 1, hasPostUTME: false, formulaConfidence: "estimated" }
];

function getInstitutionMinimum(inst) {
  if (inst.minCutoff != null) return inst.minCutoff;
  return NATIONAL_MINIMUMS[inst.type] ?? 150;
}
