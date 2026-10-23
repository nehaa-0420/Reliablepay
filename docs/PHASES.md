# Phases

Today is 19 Oct 2026. Review 2 is 24 Oct. Target: Phases 0-5 working by 23 Oct, even if rough.

| Phase | Goal | Done when |
|---|---|---|
| 0 Foundation | Scaffold compiles, docker compose up works, health endpoints respond | both services report UP |
| 1 Payment core | Migrations, create/get/list payments, idempotency, state machine, event log | duplicate POST returns same result |
| 2 Mock bank + retry | Failure injection, bank client, retry with exponential backoff, attempts log | injected failures get retried to success |
| 3 Reliability layer | Locking, UNKNOWN reconciliation, NAIVE vs PROTECTED, batches, metrics, experiment runner | experiment shows duplicates naive vs 0 protected |
| 4 Frontend | Landing page + hero, dashboard, chaos lab, comparison page | all pages work locally against backend |
| 5 Deploy | Render (2 services + Postgres), Vercel (frontend), CORS, smoke test | public URLs work end to end |
| 6 Evaluation | Parameter-tuning experiments, JMeter, charts, results write-up | tables/graphs ready for the report |
| 7 Review polish | Demo script, README, tests, screenshots, backup video | 3-minute demo rehearsed |

Rule: paste each phase's real report back to the planner before moving to the next prompt.
