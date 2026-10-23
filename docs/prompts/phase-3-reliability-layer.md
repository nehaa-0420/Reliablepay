# Phase 3 — Reliability layer (DRAFT)

Work ONLY on Phase 3.
1. Reconciliation worker: for UNKNOWN payments, call GET /bank/status/{paymentId}; charged => SUCCESS,
   not charged => RETRYING. Record events.
2. NAIVE mode: no idempotency check, blind retry on timeout (this is intentionally unsafe, for comparison).
3. Optimistic locking (version) with sensible conflict handling.
4. Batch: POST /api/payments/batch + GET /api/batches/{id}. Simulate unsynchronised secure-channel negotiation
   via channelFailureRate. NAIVE: a channel failure fails the rest of the batch. PROTECTED: failure isolated per
   item, item retried after renegotiation.
5. GET /api/metrics/summary (counts by status, duplicateCharges from bank ground truth, retrySuccessRate, avgRecoveryMs, stuckCount).
6. POST /api/experiments/run {count, concurrency, mode:both, chaos}: runs the same workload through NAIVE then
   PROTECTED and returns a comparison object. Include a reset between runs.
7. PUT/GET /api/chaos proxied to the mock bank.

Acceptance: run an experiment with 200 payments at 30% timeouts; paste the real comparison JSON.
