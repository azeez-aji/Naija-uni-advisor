/**
 * NaijaUni Advisor — reference data
 * JAMB national minimum cut-off marks and subject-combination patterns
 * reflect the 2026/2027 UTME admissions policy meeting (May 2026).
 * Course-level "realistic bands" are informed estimates built from
 * publicly reported institutional cut-off patterns — NOT official
 * JAMB figures for every department. The app always says so.
 */

const NATIONAL_MINIMUMS = {
  university: 150,
  nursing_college: 150,
  polytechnic: 100,
  college_of_education: null // no UTME score required as of 2026/2027 policy
};

// Grade point map for O'Level (WAEC/NECO/NABTEB share this scale)
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

// tier -> additional points added on top of an institution's own
// minimum cut-off to estimate a realistic, competitive score.
// Calibrated against reported 2026 patterns (e.g. Medicine realistically
// trending 260-300+ nationally; elite-federal minimums already at 200).
const TIER_BONUS = { 1: 15, 2: 30, 3: 50, 4: 75, 5: 95 };
const PRESTIGE_POINTS = 8; // extra points per prestige tier above baseline

// Institutions with a specific 2026/2027 minimum reported publicly.
// "generic" entries fall back to the national minimum for their type.
const INSTITUTIONS = [
  { id: "pan_atlantic", name: "Pan-Atlantic University", type: "private", state: "Lagos", minCutoff: 220, prestige: 2 },
  { id: "oau", name: "Obafemi Awolowo University (OAU)", type: "federal", state: "Osun", minCutoff: 200, prestige: 2 },
  { id: "uniben", name: "University of Benin (UNIBEN)", type: "federal", state: "Edo", minCutoff: 200, prestige: 2 },
  { id: "ui", name: "University of Ibadan (UI)", type: "federal", state: "Oyo", minCutoff: 200, prestige: 2 },
  { id: "unilag", name: "University of Lagos (UNILAG)", type: "federal", state: "Lagos", minCutoff: 200, prestige: 2 },
  { id: "unn", name: "University of Nigeria, Nsukka (UNN)", type: "federal", state: "Enugu", minCutoff: 200, prestige: 2 },
  { id: "covenant", name: "Covenant University", type: "private", state: "Ogun", minCutoff: 200, prestige: 2 },
  { id: "lasu", name: "Lagos State University (LASU)", type: "state", state: "Lagos", minCutoff: 195, prestige: 1 },
  { id: "lasustech", name: "Lagos State University of Science and Technology", type: "state", state: "Lagos", minCutoff: 195, prestige: 1 },
  { id: "lasue", name: "Lagos State University of Education (LASUED)", type: "state", state: "Lagos", minCutoff: 185, prestige: 1 },
  { id: "ui2", name: "Ahmadu Bello University (ABU) Zaria", type: "federal", state: "Kaduna", minCutoff: 150, prestige: 1 },
  { id: "unilorin", name: "University of Ilorin (UNILORIN)", type: "federal", state: "Kwara", minCutoff: 150, prestige: 1 },
  { id: "futa", name: "Federal University of Technology, Akure (FUTA)", type: "federal", state: "Ondo", minCutoff: 150, prestige: 1 },
  { id: "futminna", name: "Federal University of Technology, Minna", type: "federal", state: "Niger", minCutoff: 150, prestige: 1 },
  { id: "uniport", name: "University of Port Harcourt (UNIPORT)", type: "federal", state: "Rivers", minCutoff: 150, prestige: 1 },
  { id: "buk", name: "Bayero University Kano (BUK)", type: "federal", state: "Kano", minCutoff: 150, prestige: 1 },
  { id: "unizik", name: "Nnamdi Azikiwe University (UNIZIK)", type: "federal", state: "Anambra", minCutoff: 150, prestige: 1 },
  { id: "oou", name: "Olabisi Onabanjo University (OOU)", type: "state", state: "Ogun", minCutoff: 150, prestige: 1 },
  { id: "eksu", name: "Ekiti State University (EKSU)", type: "state", state: "Ekiti", minCutoff: 150, prestige: 1 },
  { id: "abuad", name: "Afe Babalola University (ABUAD)", type: "private", state: "Ekiti", minCutoff: 180, prestige: 2 },
  { id: "babcock", name: "Babcock University", type: "private", state: "Ogun", minCutoff: 180, prestige: 2 },
  { id: "landmark", name: "Landmark University", type: "private", state: "Kwara", minCutoff: 180, prestige: 1 },
  { id: "yabatech", name: "Yaba College of Technology (YABATECH)", type: "polytechnic", state: "Lagos", minCutoff: 100, prestige: 1 },
  { id: "lagospoly", name: "Lagos State Polytechnic (LASPOTECH)", type: "polytechnic", state: "Lagos", minCutoff: 100, prestige: 1 },
  { id: "kwarapoly", name: "Kwara State Polytechnic", type: "polytechnic", state: "Kwara", minCutoff: 100, prestige: 1 },
  { id: "other_federal", name: "Other Federal University (not listed)", type: "federal", state: "—", minCutoff: null, prestige: 1 },
  { id: "other_state", name: "Other State University (not listed)", type: "state", state: "—", minCutoff: null, prestige: 1 },
  { id: "other_private", name: "Other Private University (not listed)", type: "private", state: "—", minCutoff: null, prestige: 2 },
  { id: "other_poly", name: "Other Polytechnic (not listed)", type: "polytechnic", state: "—", minCutoff: null, prestige: 1 },
  { id: "other_nursing", name: "Other College of Nursing (not listed)", type: "nursing_college", state: "—", minCutoff: null, prestige: 1 }
];

function getInstitutionMinimum(inst) {
  if (inst.minCutoff != null) return inst.minCutoff;
  return NATIONAL_MINIMUMS[inst.type] ?? 150;
}
