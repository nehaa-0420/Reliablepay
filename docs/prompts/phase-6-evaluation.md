# Phase 6 — Evaluation and tuning (DRAFT)
1. JMeter (or script) load test: concurrent identical Idempotency-Key requests, many distinct requests.
2. Failure-rate sweep 0-50% in NAIVE vs PROTECTED; record duplicates, retry success rate, recovery time, p95 latency.
3. Retry parameter sweep (max attempts, base delay) to find a good QoS trade-off.
4. Export results as CSV and charts; write docs/RESULTS.md with method, tables, limitations. Report real numbers only.
