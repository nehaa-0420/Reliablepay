# Database schema (PostgreSQL). Migrations via Flyway.

## payment-service (schema: public)
payments
- id uuid PK, merchant_ref text, amount numeric(18,2), currency char(3)
- status text (INITIATED, PROCESSING, SUCCESS, FAILED, RETRYING, UNKNOWN, DEAD_LETTERED)
- mode text (PROTECTED | NAIVE), batch_id uuid null
- idempotency_key text null (UNIQUE when not null), request_hash text
- attempt_count int, next_retry_at timestamptz null, last_error text null
- version bigint (optimistic locking), created_at, updated_at

payment_attempts
- id bigserial PK, payment_id FK, attempt_no int, outcome (SUCCESS|TIMEOUT|ERROR|CHANNEL_FAILURE), latency_ms int, error_code text, created_at

payment_events  (append-only audit log)
- id bigserial PK, payment_id FK, from_status, to_status, detail text, created_at

idempotency_keys
- key text PK, request_hash text, response_status int, response_body jsonb, created_at, expires_at

batches
- id uuid PK, mode, total int, created_at

## mock-bank (schema: bank)
bank_charges  (ground truth for double-charge counting)
- id bigserial PK, payment_ref text, amount numeric(18,2), created_at   -- NOT unique on payment_ref
chaos_config (single row)
- timeout_rate, error_rate, duplicate_delivery_rate, channel_failure_rate, latency_ms
