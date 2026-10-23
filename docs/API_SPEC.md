# API spec (draft; Swagger UI at /swagger-ui.html once built)

## payment-service (Phase 1 Implemented)

### POST /api/payments
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
- **Path Variable**: `id` (UUID)
- **Response**: `200 OK` with `PaymentResponse` or `404 Not Found`.

### GET /api/payments
- **Query Params**: `status` (optional), `mode` (optional), `page` (default 0), `size` (default 20, max 100)
- **Response**: `200 OK` with paginated `Page<PaymentResponse>`.

### GET /api/payments/{id}/events
- **Path Variable**: `id` (UUID)
- **Response**: `200 OK` with list of chronological `PaymentEventResponse` audit records.

### Phase 1 Limitations
- State machine in Phase 1 creates payments in `INITIATED` state without automatically transitioning to `SUCCESS` (bank integration belongs to Phase 2).
- Batch payments (`/api/payments/batch`), chaos injection (`/api/chaos`), and metrics (`/api/metrics/summary`) are reserved for later phases.

### Planned Endpoints (Phase 2+)

## mock-bank
POST /bank/charge               {paymentRef, amount} -> 200 charged | 500 error | hangs (timeout) per chaos config
GET  /bank/charges?paymentRef=  ground-truth charges
GET  /bank/status/{paymentRef}  used by reconciliation to resolve UNKNOWN payments
PUT  /bank/admin/chaos | GET /bank/admin/chaos
GET  /bank/admin/stats          total charges, duplicate charges
POST /bank/admin/reset
