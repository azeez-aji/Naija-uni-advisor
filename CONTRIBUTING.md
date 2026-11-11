# Adding or correcting questions

All questions live in `questions.js` (one shared bank for the practice centre and the mock exam).

## Add a question
1. Copy an existing record in `QUESTION_BANK` and give it the next free id for its subject (e.g. `phy-0064`).
2. Fill every field:
   `subject`, `topic` (use an existing topic name from that subject), `difficulty` (`easy` / `moderate` / `hard`),
   `q`, `opts` (exactly 4, all different), `ans` (0–3), `explanation` (a worked explanation), `status: "ai-reviewed"`,
   `origin` (e.g. `"teacher-<name>-2026-11"`).
3. Run `node tools/validate-questions.js`. It must say "OK — question bank is valid."
4. Open a pull request. Do not commit straight to `main`.

## Rules
- Write original questions that test the official JAMB syllabus. Do not copy questions from paid or copyrighted question banks.
- Check every calculation twice. A wrong answer key teaches students the wrong thing.
- Only a subject teacher who has checked the question and explanation may change `status` to `"verified"`.
- Never put API keys, passwords or student details in the repository.
- Do not edit `netlify/functions/` unless you are the site owner.
