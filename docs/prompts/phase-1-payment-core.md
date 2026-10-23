# Phase 1 — Payment core (DRAFT: will be refined from the Phase 0 report)

Read AGENTS.md, docs/BUILD_PLAN.md, docs/DB_SCHEMA.md, docs/API_SPEC.md. Work ONLY on Phase 1.

Tasks
1. Flyway migration V1 for payment-service tables from DB_SCHEMA.md.
2. Entities, repositories, DTOs, validation (amount > 0, currency 3 letters).
3. PaymentStateMachine: single place for allowed transitions; each transition writes payment_events.
4. POST /api/payments with Idempotency-Key (PROTECTED): unique-constraint-based idempotency, request hash,
   same key+same body returns the stored response, same key+different body returns 422.
5. GET /api/payments, GET /api/payments/{id}, GET /api/payments/{id}/events.
6. For now process payments with a stub that marks SUCCESS (the bank arrives in Phase 2).
7. Unit tests for the state machine and idempotency (including two concurrent identical requests).

Acceptance: curl examples for create, duplicate create, conflicting create, list, events; test output.
