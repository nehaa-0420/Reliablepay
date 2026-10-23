# ReliablePay — Reliable Payment Processing System with Retry and Failure Handling

Design Project (Alliance University) — industry-partnered brief (Citi).
Stack: Java 17 + Spring Boot, PostgreSQL, React (Vite), Docker. Hosting: Render (backend) + Vercel (frontend).

## Layout
- `backend/payment-service` — the payment engine (idempotency, retry, state machine, reconciliation)
- `backend/mock-bank` — simulated bank/gateway with failure injection
- `frontend` — landing page, dashboard, chaos lab, naive-vs-protected comparison
- `docs` — build plan, phases, API/DB specs, summary, agent prompts
- `render.yaml` — draft Render blueprint

## Local run
    docker compose up --build        # db, mock-bank, payment-service
    cd frontend && npm install && npm run dev

The scaffold has NOT been compiled. Phase 0 (docs/prompts/phase-0-foundation.md) verifies it.
