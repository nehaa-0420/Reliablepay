# ReliablePay — Known Limitations & Scope Boundaries

This document catalogs the explicit engineering limitations, architectural trade-offs, and hosting constraints of the **ReliablePay** prototype.

---

## 1. Core Banking Protocol Abstraction
- **Current Implementation**: The mock core bank (`mock-bank`) exposes HTTP REST endpoints (`POST /bank/charge`, `GET /bank/status/{id}`).
- **Real-World Reality**: Production inter-bank switches and card networks typically operate over ISO 8583, ISO 20022 XML, or AS2/SWIFT binary/socket protocols. ReliablePay models the network failure semantics (timeouts, 503 drops, connection resets) over HTTP/JSON rather than raw socket byte framing.

## 2. Cloud Free-Tier Hosting Constraints (Render & Vercel)
- **Idle Sleep (Cold Starts)**: Free-tier Render web services spin down into sleep after 15 minutes of inactivity. The first subsequent request incurs a **50 to 90-second cold start** while the container boots and the JVM initializes. ReliablePay provides a `/api/system/wake` endpoint and a frontend `ColdStartBanner` to mitigate this during demonstrations.
- **Memory & CPU Bounds**: Free web services are limited to 512 MB RAM and 0.1 vCPU. JVM parameters are tuned (`-Xmx300m -XX:+UseSerialGC -XX:MaxMetaspaceSize=96m`), but running stress benchmarks > 100 concurrent orders on free-tier instances will cause OOM restarts.
- **Database Expiration**: Render's free managed PostgreSQL expires after 30 days. ReliablePay includes automated Flyway migrations that self-provision clean schemas when connected to a freshly created database instance.

## 3. Administrative Authentication & Access Control
- **Current Implementation**: Administrative endpoints (`/api/admin/**`, `/api/payments` list, `/api/metrics/summary`, `/api/chaos`, `/api/experiments/*`, `/api/payments/{id}/requeue`) are protected by an administrative access layer. The system supports both an HMAC-SHA256 signed session token (8-hour expiry) obtained via `POST /api/auth/admin/login` (with env-driven credentials and IP rate-limiting) and the legacy static `X-Admin-Token` header for backward-compatible automation scripts.
- **Production Requirement**: A production gateway requires OAuth 2.0 / OpenID Connect (OIDC) identity provider federation, asymmetric JWT (RS256/ES256) signature validation with JWKS rotation, multi-factor authentication (MFA), and fine-grained Role-Based Access Control (RBAC with Operator, Auditor, and Admin scopes).

## 4. Credential Storage & Scope Boundaries (Zero Credential Custody)
- **Current Implementation**: ReliablePay deliberately operates with **zero credential custody**. It does not ingest, process, store, or log card numbers (PANs), CVVs, expiration dates, or bank account credentials. All transactions use tokenized reference identifiers (`order_ref`, `merchant_ref`, `payment_id`).
- **Production Requirement**: A production merchant acquirer requires a certified PCI-DSS Level 1 Cardholder Data Environment (CDE) with Hardware Security Modules (HSMs) for encryption and tokenization.

## 5. Distributed Consistency Model
- **Current Implementation**: ReliablePay relies on **eventual consistency** through automated bank reconciliation for payments in the `UNKNOWN` state.
- **Trade-off**: When a network timeout occurs, the payment is held in the `UNKNOWN` state for a configured grace period (default 6,000ms) before status enquiry settles it. This guarantees zero duplicate debits, but introduces recovery latency (MTTR ~15–25 seconds) during heavy chaos. Distributed two-phase commit (2PC) or Saga orchestrations across banking institutions are impractical due to external bank autonomy.

## 6. Real-Time Payment Event Hub (Single-Instance In-Memory Architecture)
- **Current Implementation**: The real-time `PaymentEventHub` operates entirely in-memory using Spring's `SseEmitter` infrastructure with a thread-safe concurrent registry, capped at 200 concurrent subscriber connections and emitting 15-second keepalive heartbeats (`:heartbeat`). State transition events are published strictly after database transaction commit via `TransactionSynchronization.afterCommit`.
- **Limitation**: The in-memory hub works for a **single instance only**. In a horizontally-scaled multi-instance cluster behind a round-robin load balancer, a client connected to Instance A will miss transitions processed and committed by background retry or reconciliation workers executing on Instance B.
- **Production Requirement**: Horizontal scaling requires a distributed message broker (e.g., Redis Pub/Sub, Apache Kafka, or AWS SNS/SQS) connecting backplane instances to a unified SSE/WebSocket distribution cluster.
