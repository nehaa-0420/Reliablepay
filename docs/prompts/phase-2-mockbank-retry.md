# Phase 2 — Mock bank and retry engine (DRAFT)

Work ONLY on Phase 2.
1. mock-bank: bank_charges + chaos_config migrations; POST /bank/charge honouring timeoutRate, errorRate,
   duplicateDeliveryRate, channelFailureRate, latencyMs; GET /bank/charges, GET /bank/status/{ref},
   admin chaos/stats/reset endpoints. Every charge is recorded (no uniqueness) so duplicates are visible.
2. payment-service BankClient with a request timeout.
3. Processing flow: INITIATED -> PROCESSING -> call bank. 2xx => SUCCESS. 5xx/channel failure => RETRYING.
   Client timeout => UNKNOWN (do not blind-retry).
4. Retry worker (@Scheduled): picks RETRYING payments whose next_retry_at has passed; exponential backoff
   with jitter from application.yml; log each attempt in payment_attempts; after max attempts => DEAD_LETTERED.
5. Tests with a fake bank for success, transient failure then success, and max attempts exhausted.

Acceptance: set chaos to 50% errors, create 20 payments, show final status counts and bank charge counts.
