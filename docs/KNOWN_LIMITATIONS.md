# ReliablePay — Known Limitations & Scope Boundaries
**Document Version**: 2.0.0 (Review 3 Handoff Edition)  
**Date of Audit**: November 4, 2026  
**Audience**: Evaluation Panel, Viva Examiners, Thesis Authors  

This document catalogs the explicit engineering limitations, architectural trade-offs, and hosting constraints of the **ReliablePay** prototype. Transparent disclosure of these boundaries demonstrates engineering maturity and integrity.

---

## 1. Simulated Core Bank Only (No Real Money, No PCI-DSS Scope)
* **Current Implementation**: All banking operations interact with a simulated mock banking service (`mock-bank`) maintaining an in-memory/PostgreSQL ledger in the `bank` schema. No real money moves, and no live banking switches (e.g., NPCI UPI, Visa/Mastercard networks, SWIFT) are contacted.
* **Protocol Abstraction**: Inter-bank communication is modeled over HTTP REST (`POST /bank/charge`, `GET /bank/status/{id}`) rather than binary financial framing protocols such as ISO 8583 or ISO 20022 XML.
* **PCI-DSS Exemption**: ReliablePay deliberately operates with **zero credential custody**. It does not ingest, process, store, or log card numbers (PANs), CVVs, or expiration dates. All transactions use pre-tokenized dummy identifiers (`pm_card_demo`) and reference UUIDs, placing the prototype outside PCI-DSS Cardholder Data Environment (CDE) scope.

---

## 2. Reverse-Proxy Rate Limiting & `X-Forwarded-For` Forgeability
* **Current Implementation**: The administrative login endpoint (`POST /api/auth/admin/login`) enforces brute-force rate limiting via `LoginRateLimiter` (maximum 5 failed attempts per 15-minute rolling window). When running behind a reverse proxy (e.g., Render, Cloudflare), `AdminAuthController` inspects the first IP entry in the `X-Forwarded-For` header or `X-Real-IP`.
* **Vulnerability & Trade-off**: The first IP in `X-Forwarded-For` is **client-forgeable** if an untrusted client connects directly to the server or if the reverse proxy does not strip incoming client-supplied spoofed headers. An attacker can rotate spoofed `X-Forwarded-For: <random-ip>` headers to circumvent IP-based rate limiting unless the edge ingress proxy is configured to strictly overwrite the header with the verified TCP peer address.

---

## 3. Real-Time SSE Hub Operates on a Single Instance Only
* **Current Implementation**: The real-time event pipeline (`PaymentEventHub`) manages Server-Sent Events subscribers in JVM memory using Spring's `SseEmitter` with a concurrent collection, capped at 200 concurrent connections. Events are emitted strictly after transaction commit via `TransactionSynchronization.afterCommit`.
* **Clustering Limitation**: This in-memory architecture functions correctly on a **single instance only**. In a horizontally-scaled multi-node deployment behind a load balancer, a client connected to Instance A will not receive live SSE notifications when background retry or reconciliation workers execute on Instance B.
* **Production Requirement**: Production clustering requires an external distributed message bus (e.g., Redis Pub/Sub, Apache Kafka, or RabbitMQ) connecting worker nodes to an edge SSE/WebSocket broadcast layer.

---

## 4. Free Cloud Hosting Idle Sleep & Cold Starts
* **Render Free Tier Behavior**: Services deployed on Render's free tier enter deep sleep after 15 minutes of inbound network inactivity. The first subsequent HTTP request incurs a **50 to 90-second cold start latency** while the Linux container boots and the Spring Boot JVM initializes.
* **Demonstration Safeguard**: A wake poller script ([`scripts/wake.ps1`](../scripts/wake.ps1)) and an unauthenticated lightweight endpoint (`/api/system/wake`) are provided to pre-warm containers before presentations.
* **Database Expiration**: Render's free managed PostgreSQL database automatically expires after 30 days. Automated Flyway migrations are included so new instances can be initialized with zero manual schema scripting.

---

## 5. Local Profile Development Credentials
* **Current Implementation**: When running with the default `local` profile (`spring.profiles.default: local`), the system supplies default credentials (`admin` / `adminpassword`, static token `demo-secret-token`, and dummy HMAC secret) via `application-local.yml` to allow zero-configuration student evaluation on localhost.
* **Production Safeguard**: Outside the `local` profile (e.g., in `docker` or `production`), `AdminAuthConfig.validateOnStartup()` executes a strict assertion check that terminates the JVM immediately if `ADMIN_USERNAME`, `ADMIN_PASSWORD`, or `AUTH_TOKEN_SECRET` environment variables are missing (verified via 6 passing unit tests in `AdminStartupSafetyTest.java`).

---

## 6. NAIVE Mode is an Intentionally Unsafe Baseline
* **Purpose of NAIVE Protocol**: In the side-by-side benchmark runner (`ExperimentService.java`), NAIVE mode is deliberately designed as an unsafe strawman. When a network timeout occurs, it blindly issues immediate retries without acquiring idempotency locks or querying the bank's core ledger.
* **Real-World Reality**: Real-world commercial gateways (Stripe, Razorpay) are significantly more complex than our NAIVE implementation. NAIVE mode serves exclusively to illustrate the disastrous mathematical consequence (18.33 duplicate debits per 60 orders) that occurs when distributed timeouts are handled without stateful reconciliation.

---

## 7. Sample Size & Empirical Scope ($n=3$ Replications)
* **Statistical Limitation**: Benchmark findings reported in [`docs/handoff/FACTS_SHEET.md`](handoff/FACTS_SHEET.md) and [`docs/handoff/results/`](handoff/results/) are derived from **$n=3$ independent replications** of 60 orders per mode (120 total orders per replication, 360 transactions total).
* **Controlled Chaos Parameters**: Tests were conducted under a fixed synthetic chaos matrix (`timeoutRate=0.3, errorRate=0.1, duplicateSubmitRate=0.2, latencyMs=500`). While 100% elimination of double debits (0 duplicates, ₹0.00 loss) was verified across all 3 runs, variance in recovery latency (~20s to 23s) reflects the scheduled polling tick and grace period intervals rather than continuous variable-rate network degradation.

---

## 8. Eventual Consistency Recovery Latency Trade-off
* **Safety vs. Speed**: When an ambiguous timeout occurs, ReliablePay halts automatic retries and parks the payment in `UNKNOWN`. It enforces a mandatory 5-second grace period (to ensure the bank finishes its internal database commit) before the reconciliation worker polls `GET /bank/status/{ref}`.
* **User Experience Impact**: This design decision prioritizes **Zero Financial Loss** over instantaneous resolution. Resolving an `UNKNOWN` payment requires an average recovery latency of **21.8 to 22.4 seconds**. While appropriate for high-value banking transfers, micro-transactions in retail checkout may require shorter timeout bounds or asynchronous customer webhook notifications.
