# ReliablePay — Comprehensive Viva Defense Questions & Answers (20 Q&As)

**Document Purpose**: Definitive technical examination guide for professors, academic evaluators, and industry technical panelists. Contains 20 rigorous, defensible questions and answers covering distributed transaction theory, idempotency, failure recovery, security, architectural trade-offs, and production roadmaps.  
**Companion Documents**:
- Master Team Handoff: [`docs/TEAM_HANDOFF.md`](../TEAM_HANDOFF.md)
- Verified Facts Sheet: [`docs/handoff/FACTS_SHEET.md`](FACTS_SHEET.md)
- Known Limitations Register: [`docs/KNOWN_LIMITATIONS.md`](../KNOWN_LIMITATIONS.md)
- Claims Register: [`docs/handoff/CLAIMS_REGISTER.md`](CLAIMS_REGISTER.md)

---

### Q1: What is the fundamental difference between your 7-state model and Citi's 3-state requirement?
* **Category**: Distributed State Machine Architecture
* **Defensible Answer**:
  > *"Citi's specification mandates three business-level states: `Pending`, `Success`, and `Failed`. However, in distributed transaction processing over unbuffered networks, 'Pending' is dangerously overloaded. It could mean the payment was freshly created (`INITIATED`), is actively calling the bank (`PROCESSING`), suffered a transient gateway 500 error awaiting backoff (`RETRYING`), or encountered a dropped TCP connection where the bank's debit status is indeterminate (`UNKNOWN`). By expanding 'Pending' into these 4 deterministic sub-states, our automated background recovery workers know exactly what recovery action to take without risking race conditions or double debits. To outside consumers, external dashboards, and client APIs, all four internal sub-states roll up into Citi's 'Pending' state without breaking contract compliance."*

---

### Q2: How does your system guarantee zero duplicate charges when a bank network timeout occurs?
* **Category**: Distributed Recovery & Idempotency
* **Defensible Answer**:
  > *"When an HTTP call to the bank exceeds our 2,000 ms read timeout, we explicitly catch `ResourceAccessException` / `SocketTimeoutException`. Instead of triggering a blind retry, `PaymentProcessingService` transitions the payment record to `UNKNOWN`. We then hand off recovery to `PaymentReconciliationWorker`. After a mandatory 5-second grace period (allowing the bank's internal database commit to settle), the worker queries the bank's query status endpoint (`GET /bank/status/{bankReference}`). If the bank confirms the charge was debited to its ledger, we transition the payment to `SUCCESS`. If the bank confirms it never received the transaction, only then is it safe to retry. Because the worker always inspects the bank's ground-truth ledger before ever attempting a retry, duplicate debits are mathematically eliminated."*

---

### Q3: What happens if two identical requests hit the server at the exact same millisecond?
* **Category**: Concurrency & Database Locking
* **Defensible Answer**:
  > *"We enforce strict idempotency at the database storage engine layer rather than in application memory. We maintain an `idempotency_keys` table with a composite unique constraint on `(user_id, idempotency_key)`. When concurrent requests arrive simultaneously, the first transaction acquires the PostgreSQL row insertion lock. The second transaction immediately triggers a unique constraint violation (`DataIntegrityViolationException`). Our `IdempotencyService` catches this violation, waits for the primary transaction to complete or queries the existing row, verifies that the SHA-256 payload digest matches, and replays the cached `HTTP 200 OK` response without executing any downstream bank calls."*

---

### Q4: Why did you implement exponential backoff with full jitter instead of standard fixed-interval retries?
* **Category**: Network Resilience & Queueing Theory
* **Defensible Answer**:
  > *"If an upstream banking gateway experiences a 10-second outage and recovers, fixed-interval retries cause all delayed client requests to hammer the bank simultaneously at the exact same second—a catastrophic phenomenon known as the 'Thundering Herd' or retry storm. By applying exponential backoff with full jitter ($t = \text{base} \times 2^{\text{attempt}} \pm \text{random\_jitter}$), we disperse retry traffic uniformly across time, allowing the recovering bank gateway to stabilize gracefully. In our implementation, we use a 1,000 ms base with a 2.0 multiplier and bounded random jitter."*

---

### Q5: What if the client reuses an Idempotency-Key but changes the payment amount?
* **Category**: Security & Payload Validation
* **Defensible Answer**:
  > *"That is an idempotency violation known as payload mutation or key spoofing. We compute a SHA-256 cryptographic digest of the incoming request payload (`amount`, `currency`, `recipient`, `orderReference`). When an existing idempotency key is submitted, we compare the incoming payload hash with the stored hash in `idempotency_keys.request_hash`. If the key matches but the hash differs, we immediately reject the request with `HTTP 422 Unprocessable Entity` and a descriptive error message indicating payload mutation. The transaction is rejected before any financial processing occurs."*

---

### Q6: What prevents your background workers from picking up the same payment concurrently?
* **Category**: Concurrency & State Guarding
* **Defensible Answer**:
  > *"In our single-instance deployment, state transitions use atomic database updates with status guards: for example, `UPDATE payments SET status = 'PROCESSING' WHERE id = :id AND status = 'INITIATED'`. If two worker threads attempt to claim the same payment, only one row update succeeds because PostgreSQL row-level locks serialize the write; the second thread sees 0 updated rows and safely bails out. For a horizontally scaled multi-node production deployment, this is extended using PostgreSQL `FOR UPDATE SKIP LOCKED` or Redis distributed locks (Redlock)."*

---

### Q7: What happens if the `PaymentProcessingService` crashes while a payment is in `PROCESSING`?
* **Category**: Fault Tolerance & Orphaned State
* **Defensible Answer**:
  > *"We built an autonomous `StaleProcessingWorker` that executes every 15 seconds. It queries for any payment whose status is `PROCESSING` and whose `updated_at` timestamp is older than 60 seconds. Since no legitimate bank call can exceed 60 seconds (our client read timeout is strictly 2,000 ms), an orphaned `PROCESSING` payment indicates a thread crash, OutOfMemory error, or server termination. The worker safely transitions the payment to `UNKNOWN`, dispatches an audit event, and hands it over to the `PaymentReconciliationWorker` to check the bank's ledger."*

---

### Q8: What if the bank's reconciliation status endpoint is ALSO down or unreachable?
* **Category**: Gateway Failure Scenarios
* **Defensible Answer**:
  > *"The payment remains safely quarantined in `UNKNOWN`. The reconciliation worker continues polling with exponential backoff up to a maximum timeout threshold (e.g., 2 hours). If the bank cannot confirm the status within the threshold, the transaction transitions to `DEAD_LETTERED`. This alerts human operations personnel on the Admin Console for manual verification, ensuring that automated code never makes an unverified financial decision or issues an unverified retry."*

---

### Q9: How do you handle Server-Sent Events (SSE) when the database transaction rolls back?
* **Category**: Transactional Integrity & Event Systems
* **Defensible Answer**:
  > *"We avoid broadcasting 'phantom events' by utilizing Spring's `TransactionSynchronizationManager.registerSynchronization` with the `afterCommit` hook. When a payment state transition occurs inside a `@Transactional` boundary, the SSE event is held in a thread-local queue. Only after PostgreSQL successfully completes its ACID commit does the `afterCommit` callback release the event to the `PaymentEventHub`. If the database rolls back, the SSE event is discarded, preventing clients from ever seeing false state updates."*

---

### Q10: How do you protect your Admin endpoints against brute-force password guessing?
* **Category**: Application Security & Rate Limiting
* **Defensible Answer**:
  > *"We implemented `LoginRateLimiter`, an in-memory sliding-window rate limiter. It tracks failed authentication attempts keyed by client IP address. If an IP exceeds 5 failed login attempts within a 15-minute rolling window, all subsequent attempts from that IP are blocked with `HTTP 429 Too Many Requests`. To prevent attackers behind a reverse proxy (like Cloudflare or Render) from locking out all users sharing the proxy's IP, we configure `server.forward-headers-strategy: framework` and extract the real client IP from the first entry of the `X-Forwarded-For` or `X-Real-IP` header."*

---

### Q11: Why did you use Server-Sent Events (SSE) instead of WebSockets?
* **Category**: Client-Server Communication Protocols
* **Defensible Answer**:
  > *"Payment status updates are strictly unidirectional: the server broadcasts status updates to the client. WebSockets provide full-duplex communication, which introduces unnecessary complexity, custom framing protocols, heartbeat ping-pongs, and firewall traversal challenges. SSE operates over standard HTTP/1.1 and HTTP/2, supports automatic browser reconnection natively, works seamlessly through corporate firewalls, and consumes significantly less memory on the server. For checkout workflows, SSE is lighter, more robust, and easier to scale."*

---

### Q12: How is PCI-DSS compliance addressed in your architecture?
* **Category**: Regulatory Compliance & Data Privacy
* **Defensible Answer**:
  > *"We enforce a strict Zero Credential Custody policy. Our database schemas (`public.payments` and `bank.bank_accounts`) store zero Primary Account Numbers (PAN), CVVs, or card expiration dates. Instead, transactions reference pre-tokenized payment method identifiers (`pm_card_demo`) or masked account strings. Because sensitive authentication data never touches our application servers or persistent storage, our system falls under the lowest PCI-DSS compliance scope (SAQ A)."*

---

### Q13: What is the purpose of the `payment_attempts` table?
* **Category**: Telemetry & Audit Trails
* **Defensible Answer**:
  > *"The `payments` table maintains the current macroscopic state of the order, while `payment_attempts` is an append-only ledger tracking every individual HTTP call made to the bank for that payment. Each attempt records the attempt number, timestamp, request latency in milliseconds, HTTP response code, and any raw bank error message. This separation enables detailed latency telemetry (Average and P95 latency calculations) and forensic dispute resolution without polluting the core payment entity."*

---

### Q14: How does the Customer Mobile PWA handle offline network drops on the client device?
* **Category**: Frontend Resilience & Progressive Web Apps
* **Defensible Answer**:
  > *"Our customer mobile app (`MobilePayPage.jsx`) implements client-side retry resilience with an internal retry loop. If the user's phone temporarily loses cellular signal before reaching our server, the client retries up to 3 times with exponential backoff using the exact same `Idempotency-Key`. Once the request reaches our server, the server takes ownership of reliability, and the client switches to listening to the live SSE stream (`/api/payments/{id}/stream`). If the connection drops while waiting for the stream, the PWA reconnects automatically."*

---

### Q15: What are the main limitations of this project that you would address in a production banking rollout?
* **Category**: Architectural Limitations & Production Readiness
* **Defensible Answer**:
  > *"We document our limitations transparently in `docs/KNOWN_LIMITATIONS.md`. First, our current idempotency lock is backed by a single PostgreSQL database instance; for global active-active multi-region deployment, we would migrate to Redis Redlock or CockroachDB distributed locks. Second, our reconciliation grace period introduces an average latency trade-off of 5–20 seconds for timed-out transactions, which is standard in banking (e.g., UPI pending resolution) but requires clear UI communication. Third, for massive volume (100,000+ RPS), we would replace `@Scheduled` Spring workers with an asynchronous event mesh such as Apache Kafka or RabbitMQ."*

---

### Q16: How do you establish trust and security between the payment gateway and the upstream bank?
* **Category**: Inter-Service Security & Trust Boundaries
* **Defensible Answer**:
  > *"In a production banking integration, trust between the payment engine and the core banking system is established using Mutual TLS (mTLS) with X.509 client certificates and encrypted HMAC payload signatures. In our current microservice implementation, the two services communicate over an isolated Docker network. Administrative and chaos control endpoints require an `X-Admin-Token` bearer header. Furthermore, we implemented `AdminStartupSafetyTest`, which verifies that outside of local development profiles, the application refuses to boot if `ADMIN_PASSWORD`, `ADMIN_TOKEN`, or `AUTH_TOKEN_SECRET` are unset or set to weak defaults."*

---

### Q17: How does ReliablePay differ from commercial gateways like Stripe or Razorpay? Why not just use their SDK?
* **Category**: System Design & Commercial Landscape
* **Defensible Answer**:
  > *"Commercial gateways like Stripe, Adyen, and Razorpay solve this problem internally for their proprietary ledgers, but they treat bank connectivity as an opaque black box. When an enterprise integrates directly with acquiring banks, core banking networks (like NPCI/UPI or FedNow), or merchant aggregators via ISO 8583 or raw REST APIs, the enterprise must build its own transaction reliability engine. ReliablePay is that engine: an open, verifiable, self-hosted reliability layer that implements end-to-end idempotency, state reconciliation, stale thread recovery, and chaos simulation—giving institutions complete control without vendor lock-in or high per-transaction gateway fees."*

---

### Q18: Why build a Progressive Web App (PWA) instead of a native Android or iOS application?
* **Category**: Frontend Architecture & Product Strategy
* **Defensible Answer**:
  > *"In e-commerce checkout flows, user friction is the number one cause of cart abandonment. Requiring a consumer to download a 50 MB native application from the App Store just to complete a payment introduces massive drop-off. A Progressive Web App provides an app-like 390px mobile experience, service worker caching, and home-screen installability instantly via any web browser. Furthermore, it allows cross-platform testing on both desktop and mobile viewports with zero app store deployment delays, while maintaining full support for modern web standards like Server-Sent Events and Web Crypto."*

---

### Q19: What components of ReliablePay are simulated versus production-ready real code?
* **Category**: Experimental Validity & Implementation Scope
* **Defensible Answer**:
  > *"We make a clean distinction between what is simulated and what is real:
  - **Simulated Component**: The Mock Bank microservice (`backend/mock-bank`) is simulated. It simulates an upstream bank gateway with synthetic accounts, balances, and controllable chaos (deliberately dropping TCP responses and injecting HTTP 500 errors).
  - **Production-Ready Component**: The ReliablePay payment engine (`backend/payment-service`), the PostgreSQL relational schema, Flyway migrations, SHA-256 idempotency locks, transactional SSE event publishing, and background reconciliation workers are 100% real, functional code running against real database engines. Replacing the mock bank with a live banking partner requires only changing the HTTP client adapter, without altering our state machine or idempotency guarantees."*

---

### Q20: What happens if the bank NEVER answers—even after hours of reconciliation polling?
* **Category**: Edge Case Failure Modes & Dead Letter Queues
* **Defensible Answer**:
  > *"If the upstream bank's reconciliation status endpoint is completely unresponsive across maximum retry thresholds (configured via exponential backoff limits), the transaction transitions into the terminal `DEAD_LETTERED` state. This triggers three actions:
  1. The transaction is quarantined to prevent automated workers from making unverified decisions or issuing unauthorized retries.
  2. An alert event is dispatched to the Admin Console (`/admin/payments`), where the transaction is flagged for human operations review with a direct manual 'Requeue' or 'Force Resolve' action.
  3. The customer's UI displays a clear notification explaining that the payment is undergoing bank verification and that their balance has not been double-debited, adhering to banking SLA compliance standards."*

