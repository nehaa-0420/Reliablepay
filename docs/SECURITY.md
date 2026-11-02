# ReliablePay — Security Architecture & Data Protection

This document outlines the security posture, data minimization principles, authentication and authorization layers, and production compliance requirements for **ReliablePay**.

---

## 1. Data Classification and Storage (What We Store vs What We Never Store)

ReliablePay is designed strictly around **data minimization** and the separation of payment orchestration from credential custody.

### What is Stored in the Database
| Table | Fields Stored | Data Classification | Security Rationale |
|:------|:--------------|:--------------------|:-------------------|
| `payments` | `id`, `amount`, `currency`, `order_ref`, `merchant_ref`, `status`, `mode`, `attempt_count`, `next_retry_at`, timestamps | Internal Operational Data | Standard transaction metadata needed for state progression and reconciliation. |
| `payment_attempts` | `payment_id`, `attempt_number`, `status`, `bank_call_outcome`, `latency_ms`, `error_code`, `response_payload` | Operational Diagnostic Telemetry | Tracks retry history and timeout outcomes. Contains bank status strings (`SUCCESS`, `TIMEOUT`, `CHANNEL_FAILURE`, `ERROR`). |
| `payment_events` | `payment_id`, `from_status`, `to_status`, `detail`, `occurred_at` | Audit Log | Append-only state transition audit trail for traceability. |
| `idempotency_records` | `idempotency_key`, `request_hash`, `status`, `response_body`, `created_at`, `expires_at` | Idempotency Ledger | SHA-256 hashed request fingerprint to detect conflicting duplicate requests. |

### What is NEVER Stored or Processed
- **No Card Numbers (PANs)**: ReliablePay never ingests, stores, or transmits credit/debit card numbers.
- **No CVVs or Expiration Dates**: Sensitive card security codes are excluded from all schemas and DTOs.
- **No Bank Account Numbers or Routing Details**: Transactions operate solely using tokenized reference identifiers (`payment_id`, `order_ref`, `merchant_ref`).
- **No Plaintext Passwords or Merchant Secrets**: Authentication credentials are provided strictly via environment variables (`ADMIN_USERNAME`, `ADMIN_PASSWORD`, `AUTH_TOKEN_SECRET`) with zero in-code defaults.

---

## 2. Tokenized References & Audit Trail

1. **Tokenized References**:
   - All inter-service communication between `payment-service` and `mock-bank` references only UUIDs (`paymentRef` and `orderRef`). Even if payment records or network packets were intercepted, no cardholder data or financial credentials exist to be compromised.
2. **Deterministic Cryptographic Hash**:
   - The idempotency record stores `request_hash = SHA-256(amount + currency + orderRef + merchantRef)`. This cryptographic digest detects payload tampering or key reuse with mismatching payloads without storing sensitive payload content.
3. **Immutable Append-Only Audit Trail**:
   - Every state machine transition creates an immutable row in `payment_events`. The audit trail captures:
     - The precise previous status and new status.
     - The trigger reason (e.g., `Bank read timed out (2050ms); marked UNKNOWN for reconciliation`, `Reconciled with bank: charge confirmed`).
     - A microsecond-level timestamp.
4. **Transaction-Synchronized Real-Time Event Dispatch**:
   - The in-memory `PaymentEventHub` dispatches transition events to SSE streams strictly after the corresponding database transaction commits via `TransactionSynchronization.afterCommit`. If a transaction aborts or rolls back, zero events are emitted to clients.

---

## 3. Network Security & Transport Layer (TLS)

1. **Production Deployment**:
   - All external HTTP communication is strictly enforced over **TLS 1.3 / HTTPS**.
   - Browsers interacting with the frontend communicate over HTTPS.
   - The frontend communicates with `https://<payment-service>/api` over encrypted HTTPS.
   - Render handles automated TLS certificate issuance, renewal, and HTTP-to-HTTPS redirects.
2. **CORS Boundary Enforcement**:
   - Strict CORS configuration (`CorsConfig.java`) restricts browser API access to explicitly whitelisted origins via the `CORS_ALLOWED_ORIGINS` environment variable.
   - Preflight `OPTIONS` requests are validated before any mutating `POST` or `PUT` requests are accepted.
   - Allowed headers explicitly include `Authorization`, `X-Admin-Token`, `Idempotency-Key`, and `Content-Type`.

---

## 4. Administrative Security & Authentication Layer

Access to administrative and operational interfaces is guarded by a multi-layered security mechanism in `AdminTokenInterceptor` and `AdminAuthController`:

### Authentication Mechanisms
1. **HMAC-SHA256 Signed Bearer Tokens**:
   - Administrators authenticate via `POST /api/auth/admin/login` providing `username` and `password`.
   - Credentials originate strictly from environment variables `ADMIN_USERNAME` and `ADMIN_PASSWORD` (no defaults in code; startup fails outside `local`/`test` profiles if missing).
   - Upon successful constant-time verification, the system issues a compact HMAC-SHA256 signed token with an 8-hour expiration (`AUTH_TOKEN_SECRET`).
   - Constant-time comparison (`MessageDigest.isEqual`) is used for credential checks and cryptographic signatures to prevent side-channel timing attacks.
2. **IP-Based Login Rate Limiting**:
   - Failed authentication attempts are tracked per client IP address.
   - If an IP exceeds **5 failed attempts within 60 seconds**, subsequent login attempts from that IP are immediately rejected with `429 Too Many Requests`.
3. **Dual-Header Authorization**:
   - Administrative endpoints accept **either** `Authorization: Bearer <token>` **or** the legacy `X-Admin-Token: <token>` header (preserved for backward compatibility with automation scripts and test harnesses).

### Protected vs Open Endpoints
- **Admin-Only (Requires Valid Token)**:
  - `GET /api/payments` (full listing)
  - `GET /api/metrics/summary` (system metrics)
  - `GET /api/chaos`, `PUT /api/chaos` (bank chaos controls)
  - `POST /api/experiments/run`, `GET /api/experiments/*` (stress testing)
  - `GET /api/admin/*`, `POST /api/admin/reset`, `PUT /api/admin/config`
  - `POST /api/payments/{id}/requeue` (manual dead-letter requeue)
  - `GET /api/admin/stream` (system-wide real-time SSE event stream)
- **Customer Open Endpoints (No Credentials Required)**:
  - `POST /api/payments` (create payment / replay)
  - `GET /api/payments/{id}` (retrieve payment)
  - `GET /api/payments/{id}/events` (payment audit trail)
  - `GET /api/payments/{id}/stream` (single payment real-time SSE stream)

---

## 5. Log Scrubbing & Secret Sanitization

- Application logs (`payment-service` and `mock-bank`) output structured Slf4j events.
- No secrets, bearer tokens, admin tokens, or database passwords are ever logged.
- Docker compose environment variables for database credentials and tokens are decoupled into `.env`.
- Database error messages in the payment attempts table store sanitized bank error codes (e.g., `CHANNEL_FAILURE`, `BANK_ERROR_500`, `TIMEOUT`) without leaking internal stack traces or connection strings to external clients.

---

## 6. Honest Limitations & Production Readiness Roadmap

| Security Domain | Current Implementation | Production Enterprise Requirement |
|:----------------|:-----------------------|:----------------------------------|
| **Authentication & RBAC** | HMAC-SHA256 Bearer tokens & `X-Admin-Token` fallback. | OAuth 2.0 / OpenID Connect (OIDC) identity federation, asymmetric RS256/ES256 signatures with JWKS rotation, and multi-factor authentication (MFA). |
| **Data Encryption at Rest** | Relies on underlying PostgreSQL volume. | Transparent Data Encryption (TDE) via pgcrypto or AWS KMS / envelope encryption for database tables and backups. |
| **Audit Log Tamper-Resistance** | Append-only database table. | WORM storage (Write Once Read Many), cryptographic log chaining (hash chains), or immutable cloud audit sinks (AWS CloudTrail / Google Cloud Logging). |
| **Log Masking & DLP** | Manual code diligence. | Automated Data Loss Prevention (DLP) log filters and Logback masking patterns for any potential PII or card references. |
| **Regulatory Compliance** | Tokenized references only. | **PCI DSS Level 1** compliance assessment, **RBI Master Direction on Payment Aggregators (PA)** compliance, card vault tokenization certification, and annual SOC 2 Type II audits. |
| **Rate Limiting & DDoS Defense** | IP rate-limiting on login (5/min), concurrency bounds in experiment engine, SSE subscriber cap (200). | Distributed Redis-backed rate limiting, edge DDoS mitigation (Cloudflare / AWS WAF), and per-merchant token bucket throttling. |
