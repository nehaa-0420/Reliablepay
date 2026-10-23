# Build Plan

## 1. Scope
Build a simulated payment engine and a mock bank, plus a web UI that demonstrates reliability.
Not in scope: real banks, real money, PCI compliance, authentication beyond a simple demo guard.

## 2. Objectives -> modules -> evidence
| Objective | Module | Evidence shown to the jury |
|---|---|---|
| O1 Idempotent, retry-safe processing | Idempotency layer + Retry engine | Same Idempotency-Key twice = one charge; retries after injected timeouts succeed |
| O2 State tracking + automated recovery | State machine + event log + reconciliation worker | Payment timeline; UNKNOWN payments resolved after a crash/timeout |
| O3 Evaluate under failure and load | Chaos panel + experiment runner + metrics | Naive vs Protected table: duplicate charges, retry success rate, recovery time |

## 3. How the three base papers shape the build (verify after reading the papers)
- B1 (digital transaction landscape): audit-grade event log; Indian-context framing in the intro.
- B2 (parameter tuning for QoS): retry parameters are configurable and tuned by experiments (Phase 6).
- B3 (failure propagation in payment batches): batch endpoint + channel-negotiation failure injection;
  show propagation in NAIVE and isolation in PROTECTED.

## 4. Architecture
Frontend (Vercel) -> payment-service (Render) -> mock-bank (Render); Postgres shared (schemas public/bank).
Retry and reconciliation run as @Scheduled workers inside payment-service.

## 5. Core design decisions
- Idempotency: client sends Idempotency-Key. Insert into idempotency_keys with a unique constraint.
  Same key + same request hash -> return stored response. Same key + different hash -> 422.
  Concurrent duplicates: the unique constraint makes exactly one request win; others wait/return the stored result.
- Exactly-once at the bank: payment_ref sent to the bank is the payment id, so the bank can be asked
  "was this ref charged?" (GET /bank/status/{ref}) before any retry or reconciliation.
- Retry: only for transient outcomes (timeout, 5xx, channel failure). Exponential backoff with jitter,
  capped attempts, then DEAD_LETTERED. A timeout means outcome UNKNOWN -> check bank status first, never blind-retry.
- State transitions validated in one place; every transition writes payment_events.
- Concurrency: optimistic locking (version column) on payments; unique key for idempotency.
- NAIVE mode: no idempotency check, retries blindly on timeout. This is what produces duplicate charges.

## 6. Frontend (React + Vite + react-router + Recharts)
Pages: Landing (hero, problem, how it works, features, CTA), Dashboard (live payments, create payment,
timeline drawer), Chaos Lab (sliders, run experiment), Compare (naive vs protected charts and table), About/Architecture.
Polling every 2s. API base URL from VITE_API_BASE_URL.

## 7. Evaluation plan
Metrics: duplicate charges (from bank ground truth), retry success rate, mean time to recovery,
stuck/UNKNOWN count after reconciliation, p95 latency.
Experiments: failure-rate sweep 0-50%; retry parameter sweep (max attempts, base delay); batch with one bad channel.

## 8. Hosting
Render: Docker web services for payment-service and mock-bank + managed Postgres. Vercel: frontend.
Free tiers sleep when idle and may have time limits on the free database: check current Render/Vercel
terms, and wake both services a few minutes before any demo.

## 9. Minimum demo for Review 2 (24 Oct)
Landing page -> create payment -> duplicate click returns same payment -> bank timeout -> retry -> success ->
chaos panel -> run experiment -> Naive vs Protected numbers. Everything else is "remaining 50%".
