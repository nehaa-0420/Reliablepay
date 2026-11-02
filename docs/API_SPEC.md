# API Specification — ReliablePay

Comprehensive API documentation for `payment-service` and `mock-bank`. Swagger UI is available at `/swagger-ui.html` and OpenAPI specification at `/v3/api-docs`.

---

## 1. Authentication & Administrative Access

### POST /api/auth/admin/login
Authenticates an administrator using environment-configured credentials (`ADMIN_USERNAME` and `ADMIN_PASSWORD`). Returns an HMAC-SHA256 signed session token valid for 8 hours. Rate-limited to 5 failed attempts per minute per client IP address.

- **Request Body**:
```json
{
  "username": "admin",
  "password": "adminpassword"
}
```
- **Responses**:
  - `200 OK`: Successful authentication.
    ```json
    {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "tokenType": "Bearer",
      "expiresIn": 28800,
      "expiresAt": "2026-11-02T16:30:00Z"
    }
    ```
  - `401 Unauthorized`: Invalid credentials (constant-time comparison).
  - `429 Too Many Requests`: Exceeded 5 failed login attempts in 60 seconds from the client IP.

### GET /api/auth/admin/me
Validates an active admin token provided via `Authorization: Bearer <token>` or `X-Admin-Token`.

- **Headers**: `Authorization: Bearer <token>` OR `X-Admin-Token: <token>`
- **Responses**:
  - `200 OK`: Valid token details (`authenticated: true`, `username`, `expiresAt`, `authMethod`).
  - `401 Unauthorized`: Token expired, tampered signature, or missing header.

---

## 2. Real-Time Events (Server-Sent Events)

All SSE streams include the following response headers:
- `Content-Type: text/event-stream`
- `Cache-Control: no-cache`
- `X-Accel-Buffering: no` (disables buffering on Nginx/reverse proxies)
- Heartbeat comments (`:heartbeat\n\n`) are broadcast every 15 seconds to keep connections alive across idle proxies.
- Global capacity limit: 200 concurrent active subscriber connections (returns 429 when saturated).

### GET /api/payments/{id}/stream (Customer Stream)
Opens a real-time event stream for a single payment.
- **Access**: Public / Customer open.
- **Event Flow**:
  1. Immediately emits a `snapshot` event containing the current `PaymentResponse`.
  2. Emits `transition` events whenever state changes are committed to PostgreSQL via `TransactionSynchronization.afterCommit`.
  3. Automatically closes the stream shortly (500ms) after reaching a terminal state (`SUCCESS`, `FAILED`, `DEAD_LETTERED`).
- **Event Schema (`transition`)**:
```json
{
  "eventId": 42,
  "paymentId": "d3b07384-d113-40a2-94ea-bf71510dd567",
  "merchantRef": "ORD-12345",
  "amount": 100.50,
  "currency": "USD",
  "mode": "PROTECTED",
  "fromStatus": "INITIATED",
  "toStatus": "PROCESSING",
  "detail": "Dispatching bank charge",
  "attemptCount": 1,
  "occurredAt": "2026-11-02T09:15:00.123Z"
}
```

### GET /api/admin/stream (Admin Stream)
Opens a global real-time event stream for administrative monitoring and operational dashboards.
- **Access**: Admin only (`Authorization: Bearer <token>` OR `X-Admin-Token`).
- **Event Flow**:
  1. Immediately emits a `snapshot` event containing status counts and the last 20 transition events across all payments.
  2. Emits `transition` events for every committed payment state transition in the system.

---

## 3. Customer Payment Operations (Public Endpoints)

These endpoints remain open to merchant customers without administrative credentials:

### POST /api/payments
Creates a new payment or returns an idempotent replay of an existing payment.
- **Headers**: `Idempotency-Key` (required when `mode` is `PROTECTED`, optional/ignored in `NAIVE`)
- **Request Body**:
```json
{
  "merchantRef": "ORD-12345",
  "amount": 100.50,
  "currency": "INR",
  "mode": "PROTECTED"
}
```
- **Responses**:
  - `201 Created`: Payment record created with status `INITIATED`. Header `Location: /api/payments/{id}`.
  - `200 OK`: Idempotent replay of same key with equivalent payload returns stored response.
  - `400 Bad Request`: Validation failure (amount <= 0, invalid currency, missing merchantRef, or missing key in PROTECTED mode).
  - `422 Unprocessable Entity`: Key reused with materially conflicting request payload.

### GET /api/payments/{id}
Retrieves single payment status and metadata.
- **Path Variable**: `id` (UUID)
- **Responses**: `200 OK` with `PaymentResponse` or `404 Not Found`.

### GET /api/payments/{id}/events
Retrieves chronological audit trail events for a payment.
- **Path Variable**: `id` (UUID)
- **Response**: `200 OK` with array of `PaymentEventResponse` records.

---

## 4. Administrative Operations (Admin Protected)

These endpoints require either `Authorization: Bearer <token>` or `X-Admin-Token`:

| Method | Endpoint | Description |
|:-------|:---------|:------------|
| `GET` | `/api/payments` | Paginated listing of payments (`status`, `mode`, `page`, `size`). |
| `GET` | `/api/metrics/summary` | Aggregated latency, recovery counts, and volume metrics. |
| `GET` | `/api/chaos` | Queries current bank chaos injection settings. |
| `PUT` | `/api/chaos` | Updates chaos injection rates (timeout %, error %, drop %). |
| `POST` | `/api/experiments/run` | Triggers stress benchmark experiment. |
| `GET` | `/api/experiments/*` | Fetches experiment status, results, and active progress. |
| `GET` | `/api/admin/config` | Retrieves operational configuration (timeouts, retry limits, grace ms). |
| `PUT` | `/api/admin/config` | Dynamically updates operational configuration. |
| `POST` | `/api/admin/reset` | Purges database and resets mock-bank state (when enabled). |
| `POST` | `/api/payments/{id}/requeue` | Requeues a `DEAD_LETTERED` payment back to `RETRYING`. |
| `GET` | `/api/admin/stream` | Real-time global SSE administrative event feed. |

---

## 5. Mock Core Bank Endpoints (`mock-bank`)

- `POST /bank/charge`: Processes synchronous charge `{ paymentRef, orderRef, amount }`. Returns 200 (SUCCESS), 500 (ERROR), 503 (CHANNEL_FAILURE), or hangs (TIMEOUT) according to chaos settings.
- `GET /bank/charges?paymentRef=`: Returns ground-truth ledger records for a payment reference.
- `GET /bank/status/{paymentRef}`: Reconciliation status query returning whether a charge was debited and count.
- `GET/PUT /bank/admin/chaos`: Mock-bank chaos controls.
- `GET /bank/admin/stats`: Aggregate ledger stats (total charges, duplicate debits).
- `POST /bank/admin/reset`: Clears mock-bank ledger and counters.

---

## 6. Background Asynchronous Workers

ReliablePay executes autonomous background workers to guarantee at-least-once delivery and zero duplicate debits:

### A. PaymentRetryWorker
- **Schedule**: Fixed delay `app.retry.poll-interval-ms` (default: 1000ms).
- **Query**: `SELECT * FROM payments WHERE status = 'RETRYING' AND next_retry_at <= :now ORDER BY next_retry_at ASC LIMIT :limit FOR UPDATE SKIP LOCKED`.
- **Action**: Increments attempt count, transitions to `PROCESSING`, and dispatches asynchronous bank execution without holding database transactions.

### B. PaymentRecoveryWorker (Stale PROCESSING Recovery)
- **Schedule**: Fixed delay `app.recovery.poll-interval-ms` (default: 2000ms).
- **Query**: `SELECT * FROM payments WHERE status = 'PROCESSING' AND mode = 'PROTECTED' AND updated_at <= :threshold ORDER BY updated_at ASC LIMIT :limit FOR UPDATE SKIP LOCKED`.
- **Threshold**: `updated_at <= now - app.recovery.stale-processing-ms` (default: 60000ms, exceeding bank read timeout plus worker queue wait).
- **Safety Rules**: Only `PROTECTED` mode payments are recovered. `NAIVE` mode stays unsafe.
- **Action**: Transitions stuck payments to `UNKNOWN` through `PaymentStateMachine` with event detail `"Recovered after interruption: outcome unknown"`, commits audit events, broadcasts SSE events, and sets timestamps so `PaymentReconciliationWorker` can resolve them.

### C. PaymentReconciliationWorker
- **Schedule**: Fixed delay `app.reconcile.poll-interval-ms` (default: 2000ms).
- **Query**: `SELECT * FROM payments WHERE status = 'UNKNOWN' AND updated_at <= :threshold ORDER BY updated_at ASC LIMIT :limit FOR UPDATE SKIP LOCKED`.
- **Action**: Queries `GET /bank/status/{paymentRef}`. If charged at bank, transitions to `SUCCESS` without second debit. If not charged, transitions to `RETRYING` for safe retry.
