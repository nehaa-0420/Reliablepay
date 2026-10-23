# ReliablePay — Security Architecture & Data Protection

This document outlines the security posture, data minimization principles, authorization guards, and production compliance requirements for **ReliablePay**.

---

## 1. Data Classification and Storage (What We Store vs What We Never Store)

ReliablePay is designed strictly around **data minimization** and the separation of payment orchestration from credential custody.

### What is Stored in the Database
| Table | Fields Stored | Data Classification | Security Rationale |
|:------|:--------------|:--------------------|:-------------------|
| `payments` | `id`, `amount`, `currency`, `order_ref`, `merchant_ref`, `status`, `mode`, `retry_count`, `next_retry_at`, timestamps | Internal Operational Data | Standard transaction metadata needed for state progression and reconciliation. |
| `payment_attempts` | `payment_id`, `attempt_number`, `status`, `bank_call_outcome`, `latency_ms`, `error_code`, `response_payload` | Operational Diagnostic Telemetry | Tracks retry history and timeout outcomes. Contains bank status strings (`SUCCESS`, `TIMEOUT`, `CHANNEL_FAILURE`, `ERROR`). |
| `payment_events` | `payment_id`, `from_status`, `to_status`, `reason`, `created_at` | Audit Log | Append-only state transition audit trail for traceability. |
| `idempotency_keys` | `key`, `payment_id`, `request_hash`, `created_at`, `expires_at` | Idempotency Ledger | SHA-256 hashed request fingerprint to detect conflicting duplicate requests. |

### What is NEVER Stored or Processed
- **No Card Numbers (PANs)**: ReliablePay never ingests, stores, or transmits credit/debit card numbers.
- **No CVVs or Expiration Dates**: Sensitive card security codes are excluded from all schemas and DTOs.
- **No Bank Account Numbers or Routing Details**: Transactions operate solely using tokenized reference identifiers (`payment_id`, `order_ref`, `merchant_ref`).
- **No Passwords or Merchant Secrets**: Authentication tokens are not stored in database tables.

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

---

## 3. Network Security & Transport Layer (TLS)

1. **Production Deployment (Render & Vercel)**:
   - All external HTTP communication is strictly enforced over **TLS 1.3 / HTTPS**.
   - Browsers interacting with the Vite frontend communicate over HTTPS.
   - The frontend communicates with `https://<payment-service>/api` over encrypted HTTPS.
   - Render handles automated TLS certificate issuance, renewal, and HTTP-to-HTTPS redirects.
2. **CORS Boundary Enforcement**:
   - Strict CORS configuration (`CorsConfig.java`) restricts browser API access to explicitly whitelisted origins via the `CORS_ALLOWED_ORIGINS` environment variable.
   - Preflight `OPTIONS` requests are validated before any mutating `POST` or `PUT` requests are accepted.

---

## 4. Administrative Security Guard (`X-Admin-Token`)

Mutating and sensitive administrative endpoints are guarded by `AdminTokenInterceptor` and `BankAdminTokenInterceptor`:

### Protected Endpoints
- `POST /api/admin/reset`: Purges database records and resets bank state.
- `PUT /api/admin/config`: Dynamically updates system tuning parameters (timeouts, grace periods, retries).
- `PUT /api/chaos`: Modifies bank failure injection rates.
- `POST /api/experiments/run`: Triggers benchmark stress runs.
- `GET/PUT/POST /bank/admin/**`: Accesses mock-bank administration, stats, and ledger resets.

### Authorization Mechanics
- **Configured Token**: In deployment or when `ADMIN_TOKEN` is set, all callers must supply the matching `X-Admin-Token: <token>` header.
- **Unauthorized Handling**: Requests missing the header or supplying an invalid token immediately return `HTTP 401 Unauthorized` with JSON `{ "status": 401, "error": "Unauthorized", "message": "Invalid or missing X-Admin-Token header" }`.
- **Local Developer Ergonomics**: When `ADMIN_TOKEN` is left empty or unset in a local developer environment, administrative endpoints allow local execution without artificial friction.

---

## 5. Log Scrubbing & Secret Sanitization

- Application logs (`payment-service` and `mock-bank`) output structured Slf4j events.
- No secrets, admin tokens, or database credentials are ever logged.
- Docker compose environment variables for database credentials and tokens are decoupled into `.env`.
- Database error messages in the payment attempts table store sanitized bank error codes (e.g., `CHANNEL_FAILURE`, `BANK_ERROR_500`, `TIMEOUT`) without leaking internal stack traces or connection strings to external clients.

---

## 6. Honest Limitations & Production Readiness Roadmap

While ReliablePay demonstrates bank-grade resilience against network chaos and duplicate charges, it is designed as an educational and benchmark demonstration. A full enterprise production deployment would require the following additional security controls:

| Security Domain | Current Prototype Implementation | Production Enterprise Requirement |
|:----------------|:---------------------------------|:----------------------------------|
| **Authentication & RBAC** | Static shared `X-Admin-Token` secret. | OAuth 2.0 / OpenID Connect with JWTs, Role-Based Access Control (Admin, Operator, Read-Only), and short-lived scoped tokens. |
| **Data Encryption at Rest** | Relies on underlying PostgreSQL volume. | Transparent Data Encryption (TDE) via pgcrypto or AWS KMS / envelope encryption for database tables and backups. |
| **Audit Log Tamper-Resistance** | Append-only database table. | WORM storage (Write Once Read Many), cryptographic log chaining (hash chains), or immutable cloud audit sinks (AWS CloudTrail / Google Cloud Logging). |
| **Log Masking & DLP** | Manual code diligence. | Automated Data Loss Prevention (DLP) log filters and Logback masking patterns for any potential PII or card references. |
| **Regulatory Compliance** | Tokenized references only. | **PCI DSS Level 1** compliance assessment, **RBI Master Direction on Payment Aggregators (PA)** compliance, card vault tokenization certification, and annual SOC 2 Type II audits. |
| **Rate Limiting & DDoS Defense** | Concurrency bounds in experiment engine. | Edge rate limiting (Cloudflare / AWS WAF), per-API-key token bucket throttling, and IP reputation filtering. |
