# AGENTS.md — Working rules for the coding agent

Project: ReliablePay — a reliable payment processing system with retry and failure handling
(college Design Project, industry brief from Citi). Read `docs/PROJECT_SUMMARY.md` first,
then `docs/BUILD_PLAN.md`. Work only on the phase named in the prompt you are given.

## Rules
1. Do one phase at a time. Do not start work from later phases.
2. Never fake results. If a build, test or deploy fails, say so and show the real error.
3. Run the acceptance commands listed in the phase prompt and paste their REAL output.
4. Keep scope small and explainable: every module must map to an objective in BUILD_PLAN.md.
5. Prefer plain, readable code the student can explain in a viva. Comment the "why" for
   idempotency, locking, retry and reconciliation logic.
6. Do not add services, databases or libraries that are not in BUILD_PLAN.md without asking.
7. No secrets in the repo. Config comes from environment variables (see application.yml).
8. Versions in pom.xml / package.json were not compiled by the author. Fix them if the build fails.

## Report format (end every phase with this, so the student can paste it back)
- Summary: what was built (max 8 lines)
- Files created/changed
- Commands run + real output (build, tests, curl examples)
- What is NOT working / skipped / assumptions made
- URLs or ports involved
