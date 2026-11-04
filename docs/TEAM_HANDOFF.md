# ReliablePay — Master Team Handoff & Viva Preparation Guide

> 🎯 **Purpose of this Document**:  
> This guide is the central operational manual for the entire project team. Whether you are **writing the academic report**, **building presentation slides**, **leading the live panel demonstration**, or **defending the architecture during the viva examination**, this document gives you everything you need to succeed without having to dig through backend source code.

---

## Table of Contents
1. [Role-Based Navigation](#1-role-based-navigation)
2. [The Problem & Solution in Plain English](#2-the-problem--solution-in-plain-english)
3. [The Authoritative Facts & Metrics Summary](#3-the-authoritative-facts--metrics-summary)
4. [5-Minute Live Panel Demonstration Script](#4-5-minute-live-panel-demonstration-script)
5. [12-Slide Presentation Deck Outline](#5-12-slide-presentation-deck-outline)
6. [Top 15 Viva Defense Questions & Defensible Answers](#6-top-15-viva-defense-questions--defensible-answers)
7. [System Diagrams & Visual Assets Index](#7-system-diagrams--visual-assets-index)
8. [Quick-Start Commands Reference](#8-quick-start-commands-reference)

---

## 1. Role-Based Navigation

Find your assigned responsibility below and follow the direct links:

| Your Team Role | What You Need to Do | Where to Look in this Repo |
| :--- | :--- | :--- |
| 📝 **Report Author / Thesis Lead** | Copy verified metrics, architecture explanations, database schemas, and state transition tables into the project report. | • [Facts & Metrics Sheet](handoff/FACTS_SHEET.md)<br>• [Diagrams Directory](handoff/diagrams/README.md)<br>• [Section 2: Plain English Model](#2-the-problem--solution-in-plain-english)<br>• [Benchmark Summary](handoff/results/results_summary.md) |
| 🎨 **Slide Deck / Presentation Designer** | Create 10–12 clean slides with system diagrams, comparison charts, and punchy talking points. | • [Section 5: 12-Slide Deck Outline](#5-12-slide-presentation-deck-outline)<br>• [Diagrams Directory](handoff/diagrams/README.md)<br>• [Benchmark Summary Table](handoff/results/results_summary.md) |
| 🎤 **Live Demo Lead** | Walk the evaluation panel through the live user interface in 5 minutes smoothly and without getting stuck. | • [Section 4: 5-Minute Demo Script](#4-5-minute-live-panel-demonstration-script)<br>• [DEMO_CHECKLIST.md](DEMO_CHECKLIST.md)<br>• [Section 8: Quick-Start Commands](#8-quick-start-commands-reference) |
| 🛡️ **Viva Technical Defender** | Answer difficult technical questions from academic professors and industry panelists with confidence. | • [Section 6: Top 15 Viva Q&A](#6-top-15-viva-defense-questions--defensible-answers)<br>• [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md)<br>• [SECURITY.md](SECURITY.md) |
| 👥 **Non-Technical Team Member** | Understand the core distributed systems dilemma and how ReliablePay prevents double debits. | • [Section 2: Plain English Model](#2-the-problem--solution-in-plain-english) |

---

## 2. The Problem & Solution in Plain English

### The Everyday Analogy: The Coffee Shop Dilemma
Imagine you tap your credit card at a coffee shop counter. 
1. The card reader beeps, contacts the bank, and your bank account is immediately debited ₹250.
2. However, right as the bank sends the "Approved!" signal back across the mobile cellular tower, the coffee shop's Wi-Fi drops for two seconds.
3. The card machine screen flashes **"Network Error: Transaction Timed Out"**.
4. The cashier says: *"Oh, it timed out. Let me swipe your card again."*
5. If the cashier swipes again, **you get charged twice (₹500 for one coffee)**. If the cashier does NOT swipe again and lets you walk away, the coffee shop might lose ₹250 if the first swipe actually went through.

This is the classic **"Charged-But-Response-Lost"** distributed systems dilemma (related to the fundamental Two Generals' Paradox in computer science).

### Why Traditional "Naive" Systems Fail:
Traditional basic payment gateways handle a timeout by simply retrying the charge immediately. When the bank already processed the first request, the blind retry creates a brand-new debit on the customer's account. In our empirical testing under 30% timeout chaos, **this naive approach double-debited customers 18.3 times per 60 orders, causing ₹2,300 in customer losses**.

### How ReliablePay Solves It (The 3 Defenses):
1. **Cryptographic Idempotency**: Every payment request receives a unique `Idempotency-Key` and a SHA-256 payload digest. Even if a user frantically mashes "Pay Now" 10 times in one second, the database rejects the duplicates at the SQL level.
2. **The "UNKNOWN" Parking State**: When a network timeout occurs, ReliablePay **never retries blindly**. Instead, it parks the transaction in an ambiguous `UNKNOWN` state.
3. **Automated Background Reconciliation**: While the transaction is parked in `UNKNOWN`, an automated background worker queries the bank's core ledger (`GET /bank/status/{id}`) to ask: *"Did you debit this order, yes or no?"*
   - If the bank says **"Yes, I debited it"**: ReliablePay transitions the payment to `SUCCESS`.
   - If the bank says **"No, I never received it"**: ReliablePay safely transitions it to `RETRYING` with exponential backoff.

**The Result**: **Zero Duplicate Orders (0.00 mean) and ₹0.00 customer financial loss** under heavy network chaos.

---

## 3. The Authoritative Facts & Metrics Summary

> ⚠️ **Rule for Reports & Slides**: Always quote these exact verified numbers from [docs/handoff/FACTS_SHEET.md](handoff/FACTS_SHEET.md).

* **Test Suite**: **78 / 78 tests passing (100% pass rate)** (Evidence: [`docs/handoff/evidence/mvn_payment_service.txt`](handoff/evidence/mvn_payment_service.txt), [`docs/handoff/evidence/mvn_mock_bank.txt`](handoff/evidence/mvn_mock_bank.txt)).
  * Payment Service: **69 tests passing** across 12 test classes.
  * Mock Bank Service: **9 tests passing** across 2 test classes.
  * Frontend: Production build passes with 0 warnings/errors (Vite v5.4.14, 3,207 modules, PWA v2.0.0; Evidence: [`docs/handoff/evidence/npm_build.txt`](handoff/evidence/npm_build.txt)).
  * High-Throughput Load Testing: Sustained throughput of **65.72 to 102.1 req/sec** under 100 concurrent VUs (Evidence: [`docs/handoff/evidence/load_test.txt`](handoff/evidence/load_test.txt)).
* **Replicated Benchmark Results (Mean across 3 runs of 60 orders under 30% bank timeout chaos)**:
  * **NAIVE Mode**: **18.33 duplicate orders charged** | **₹2,300.00 overcharged** | 89.7% final success rate.
  * **PROTECTED Mode**: **0.00 duplicate orders charged** | **₹0.00 overcharged** | **100.0% final success rate**.
  * **Safety Invariant**: **100% elimination of double debits** (`min: 0, max: 0`).
* **State Machine**: **7 deterministic internal states** (`INITIATED`, `PROCESSING`, `SUCCESS`, `FAILED`, `RETRYING`, `UNKNOWN`, `DEAD_LETTERED`).
* **Security & Auth**:
  * JWT Bearer authentication with HMAC-SHA256.
  * Brute-force sliding-window rate limiter: **Max 5 failed attempts per 15 minutes per IP**.
  * Reverse-proxy client IP isolation using `X-Forwarded-For` and `X-Real-IP`.
  * **Zero Credential Custody**: No credit card PAN or CVV stored in any database.

---

## 4. 5-Minute Live Panel Demonstration Script

Use this exact chronological script during your presentation. Keep two browser tabs open side by side: Tab 1 for the **Customer Mobile App** (`/app`), Tab 2 for the **Admin Console** (`/admin`).

```
   ┌──────────────────────────────────┐        ┌──────────────────────────────────┐
   │       Tab 1: Mobile App          │        │       Tab 2: Admin Console       │
   │      http://localhost:5173/app   │        │     http://localhost:5173/admin  │
   │  [Customer Checkout & Keypad]   │        │  [Real-Time Live SSE Pipeline]   │
   └──────────────────────────────────┘        └──────────────────────────────────┘
```

### Minute 1: The Context & Dual Interface Setup (Landing Page)
* **Navigate to**: `http://localhost:5173/`
* **Speaker Script**:
  > *"Good morning, esteemed panel. In digital banking, network timeouts are inevitable, but double-charging a customer is completely unacceptable. Today we present ReliablePay, an enterprise-grade fault-tolerant payment engine. As you see on our landing page, ReliablePay provides a complete dual-experience: a Customer Mobile App on the left for seamless payments, and an Admin Operations Console on the right for real-time observability."*
* **Action**: Click "Open Customer App" to open `/app`, and in a second window open `/admin`.

### Minute 2: Simulating the Lost-Response Timeout (Customer Mobile App)
* **Navigate to**: `http://localhost:5173/app`
* **Action**:
  1. Select **Swiggy** or **Uber** from the merchant list.
  2. Enter an amount (e.g., `₹500`).
  3. Toggle ON the switch labeled **"Simulate Lost Response (Chaos Demo)"**.
  4. Click the blue **"Pay ₹500"** button.
* **Speaker Script**:
  > *"Notice what happens now. We've deliberately simulated the dreaded network timeout. The bank has debited the funds, but the confirmation response was dropped in transit. Notice that our user interface does NOT crash, and it does NOT say 'Transaction Failed, Please Try Again'—because that would cause the customer to pay twice! Instead, it displays a friendly live progress tracker with an explicit badge: 'Safety Guarantee: You will never be debited twice.'"*

### Minute 3: Real-Time Engine Observability (Admin Live Monitor)
* **Navigate to**: `http://localhost:5173/admin`
* **Action**: Point to the Framer Motion state board and the live event ticker.
* **Speaker Script**:
  > *"Now look at the Admin Console running in real time via Server-Sent Events. The payment transitioned from INITIATED to PROCESSING, and when the bank read timed out after 2000 milliseconds, ReliablePay did NOT retry blindly. It transitioned the payment into UNKNOWN. After a brief grace period, our autonomous background Reconciliation Worker queried the core bank's ground-truth ledger, confirmed the debit, and settled the transaction cleanly to SUCCESS. The customer's mobile app instantly updated to Green 'Payment Successful' via SSE."*

### Minute 4: The Empirical Proof — NAIVE vs PROTECTED (Compare Page)
* **Navigate to**: `http://localhost:5173/admin/compare` (or run a quick test in `/admin/lab`)
* **Action**: Show the side-by-side benchmark comparison cards.
* **Speaker Script**:
  > *"To scientifically prove our system, we injected identical network chaos (30% bank timeout, 10% errors) across 60 transactions in two modes. In NAIVE mode—which mirrors standard naive retry implementations—the bank charged 18 duplicate orders, stealing ₹2,300 in customer overcharges. In PROTECTED mode, duplicate charges were EXACTLY ZERO. We achieved 100% elimination of double debits while maintaining a 100% final success rate."*

### Minute 5: Auditability & Security Governance (Transactions Ledger)
* **Navigate to**: `http://localhost:5173/admin/payments`
* **Action**: Click the top transaction to slide open the **Payment Details Drawer**.
* **Speaker Script**:
  > *"Finally, regulatory compliance requires total traceability. Every single transition—from the cryptographic idempotency lock, to the bank attempt, to the reconciliation event—is permanently recorded in an append-only audit log with millisecond timestamps and attempt counts. Behind the scenes, the system enforces JWT authentication, brute-force IP rate limiting, and zero credential custody. Thank you, and we welcome your questions."*

---

## 5. 12-Slide Presentation Deck Outline

Here is the recommended slide-by-slide structure for Microsoft PowerPoint or Google Slides:

### Slide 1: Title & Team Credentials
* **Slide Title**: ReliablePay: A Fault-Tolerant Payment Processing Engine
* **Subtitle**: Deterministic State Management & Automated Status Reconciliation under Network Chaos
* **Content**: Team Member Names, Project ID, Citi Industry Brief, Academic Institution, Date.
* **Visual**: Clean corporate branding, Citi logo, ReliablePay shield icon.

### Slide 2: The Core Problem: The Double-Debit Crisis
* **Slide Title**: Distributed Systems Dilemma: The "Lost-Response" Problem
* **Key Points**:
  * Network timeouts are inevitable in mobile commerce (flaky 4G/5G, gateway timeouts).
  * The dilemma: *Did the bank process the debit before the network dropped?*
  * The catastrophic failure of naive systems: blind retries charge customers twice.
  * Real-world consequence: Customer churn, chargeback fees, brand destruction.
* **Visual**: Diagram showing Merchant → Gateway → Bank with a red "X" across the return path.

### Slide 3: Citi Industry Brief Alignment
* **Slide Title**: Citi Specification & Architectural State Expansion
* **Key Points**:
  * Citi Brief Requirement: Implement **Pending**, **Success**, and **Failed** business states.
  * Why 3 states are insufficient in production: "Pending" is too ambiguous to guide automated recovery.
  * ReliablePay's 7-State Finite State Machine:
    * `INITIATED` & `PROCESSING` (Active Pending)
    * `RETRYING` (Transient recoverable error)
    * `UNKNOWN` (Ambiguous timeout quarantine)
    * `SUCCESS` & `FAILED` & `DEAD_LETTERED` (Terminal states)
* **Visual**: Comparison table mapping Citi's 3 states to ReliablePay's 7 states.

### Slide 4: End-to-End System Architecture
* **Slide Title**: Multi-Tier Decoupled Architecture
* **Key Points**:
  * **Client Tier**: React PWA with client-side retry resilience & SSE event listener.
  * **Service Tier**: Spring Boot 3.3.4 microservice with 3 non-blocking background workers.
  * **Data Tier**: PostgreSQL 16 with ACID transactions and cryptographic idempotency locks.
  * **Bank Simulator**: Isolated mock core banking engine with dynamic chaos injection.
* **Visual**: Embed [`docs/handoff/diagrams/architecture.mmd`](handoff/diagrams/architecture.mmd).

### Slide 5: Defense 1: Cryptographic Idempotency
* **Slide Title**: Defense 1: Preventing Double-Clicks & Concurrent Submissions
* **Key Points**:
  * Every request requires an `Idempotency-Key` header (UUID or client token).
  * Payload validation: SHA-256 digest generated from `(amount + currency + order_ref + recipient)`.
  * Database Unique Constraint: `UNIQUE (user_id, idempotency_key)`.
  * Concurrent duplicate requests receive cached response (`HTTP 200 OK`) without re-executing bank charges.
  * Payload mutation protection: returns `HTTP 422 Unprocessable Entity` if key is reused with different data.
* **Visual**: Sequence diagram of concurrent request deduplication.

### Slide 6: Defense 2 & 3: Backoff Jitter & Two-Phase Reconciliation
* **Slide Title**: Defense 2 & 3: Recovering from Failures & Ambiguity
* **Key Points**:
  * **Exponential Backoff with Full Jitter**: Prevents "Thundering Herd" syndrome when banking APIs recover ($t = \text{base} \times 2^{\text{attempt}} \pm \text{jitter}$).
  * **Ambiguous Timeout Isolation**: Timeout does NOT mean failure; payment moves to `UNKNOWN`.
  * **Automated Reconciliation Worker**: Sweeps `UNKNOWN` records every 5s, querying the bank's core ledger (`GET /bank/status/{id}`) to resolve finality deterministically.
* **Visual**: Embed [`docs/handoff/diagrams/lost_response_sequence.mmd`](handoff/diagrams/lost_response_sequence.mmd).

### Slide 7: Real-Time Observability & Operator Pipeline
* **Slide Title**: Real-Time Streaming & Comprehensive Audit Trail
* **Key Points**:
  * Spring `SseEmitter` pipeline broadcasts state changes with 0 polling overhead.
  * `TransactionSynchronization.afterCommit` ensures events only broadcast after database commit.
  * Live Admin Board: Framer Motion column cards, status counters, and 60-second throughput telemetry.
  * Immutable Audit Log: `payment_events` table preserves chronological forensic history.
* **Visual**: Embed [`docs/handoff/diagrams/sse_realtime_flow.mmd`](handoff/diagrams/sse_realtime_flow.mmd) or screenshot of `/admin`.

### Slide 8: Empirical Validation & Benchmark Findings
* **Slide Title**: Empirical Proof: NAIVE vs. PROTECTED Under Chaos
* **Key Points**:
  * **Workload**: 60 orders, 10 concurrent threads, 30% bank timeout, 10% upstream 503 errors.
  * **NAIVE Protocol**: 18.33 duplicate charges (₹2,300 overcharged), 89.7% success rate.
  * **PROTECTED Protocol**: **0.00 duplicate charges (₹0.00 overcharged)**, **100.0% success rate**.
  * **Conclusion**: 100% elimination of double debits with 0 customer financial loss.
* **Visual**: Side-by-side bar chart of Duplicate Orders (18.3 vs 0) and Overcharged Amount (₹2,300 vs ₹0).

### Slide 9: Enterprise Security & Production Hardening
* **Slide Title**: Security Architecture & Defensive Safeguards
* **Key Points**:
  * **Authentication**: JWT Bearer Tokens signed with HMAC-SHA256 (`/api/admin/**`).
  * **Anti-Brute Force**: Sliding-window rate limiter (5 failed attempts per 15 min per IP).
  * **Proxy Isolation**: `X-Forwarded-For` client IP isolation prevents shared NAT lockouts.
  * **Zero Credential Custody**: Fully compliant with PCI-DSS guidelines (no raw card data stored).
  * **Timing-Attack Resistance**: Constant-time credential checks via `MessageDigest.isEqual()`.
* **Visual**: Security layer diagram or Admin Login screen screenshot.

### Slide 10: Technical Debt, Trade-offs & Limitations
* **Slide Title**: Honest Engineering: Design Trade-offs & Limitations
* **Key Points**:
  * **Reconciliation Latency Trade-off**: Resolving `UNKNOWN` payments takes 5–22 seconds (safety chosen over premature failure).
  * **Locking Strategy**: Database-level locks are ideal for single-instance/read-replica; multi-region active-active requires distributed locks (Redis Redlock).
  * **Bank Status Availability**: If the bank's status endpoint is ALSO down, transactions safely expire to `DEAD_LETTERED` for manual human intervention.
* **Visual**: Trade-off spectrum (Consistency & Safety vs Instant Latency).

### Slide 11: Summary of Contributions
* **Slide Title**: Project Summary & Compliance Matrix
* **Key Points**:
  * Full compliance with Citi project deliverables.
  * 78 automated tests passing (100% coverage of edge cases).
  * Fully containerized Docker Compose stack + cloud deployment readiness (Render/Vercel).
  * Production-grade customer mobile PWA and enterprise administrator console.
* **Visual**: Green checkmark matrix of all requirements completed.

### Slide 12: Conclusion & Q&A
* **Slide Title**: ReliablePay: Zero Duplicate Charges, Guaranteed
* **Content**: GitHub Repository Link, Live Demo URL, Thank You, Open for Panel Questions.

---

## 6. Top 15 Viva Defense Questions & Defensible Answers

### Q1: What is the fundamental difference between your 7-state model and Citi's 3-state requirement?
* **Defensible Answer**:
  > *"Citi's specification asks for three business-level states: Pending, Success, and Failed. However, in distributed transaction processing, 'Pending' is overloaded. It could mean the payment was just created (`INITIATED`), is actively calling the bank (`PROCESSING`), suffered a transient network error awaiting retry (`RETRYING`), or encountered a dropped connection where the bank's state is unknown (`UNKNOWN`). By expanding 'Pending' into these 4 deterministic sub-states, our automated background workers know exactly what recovery action to take without risking race conditions or double debits. To outside consumers, all four sub-states roll up into Citi's 'Pending' state."*

### Q2: How does your system guarantee zero duplicate charges when a network timeout occurs?
* **Defensible Answer**:
  > *"When a bank call exceeds our 2000ms read timeout, we explicitly catch `ResourceAccessException` / `SocketTimeoutException`. Instead of retrying, `PaymentProcessingService` transitions the record to `UNKNOWN`. We then rely on `PaymentReconciliationWorker`. After a 5-second grace period (allowing the bank's internal database commit to settle), the worker queries the bank's query status endpoint (`GET /bank/status/{bankReference}`). If the bank confirms the charge was recorded, we transition to `SUCCESS`. If the bank confirms it never received it, only then is it safe to retry. Because the worker checks the bank's ground-truth ledger before ever attempting a retry, duplicate debits are mathematically eliminated."*

### Q3: What happens if two identical requests hit the server at the exact same millisecond?
* **Defensible Answer**:
  > *"We enforce strict idempotency at the database constraint level. We maintain an `idempotency_keys` table with a composite unique constraint on `(user_id, idempotency_key)`. When concurrent requests arrive, the first transaction acquires the insert row lock. The second transaction immediately triggers a PostgreSQL unique constraint violation (`DataIntegrityViolationException`). Our `IdempotencyService` catches this violation, waits for the primary transaction to complete or reads the existing record, verifies that the SHA-256 payload digest matches, and replays the cached `HTTP 200 OK` response without executing any downstream bank calls."*

### Q4: Why did you implement exponential backoff with full jitter instead of standard fixed-interval retries?
* **Defensible Answer**:
  > *"If an upstream banking gateway experiences a 10-second outage and recovers, fixed-interval retries cause all delayed client requests to hammer the bank simultaneously at the exact same second—a phenomenon known as the 'Thundering Herd' or retry storm. By applying exponential backoff with full jitter ($t = \text{base} \times 2^{\text{attempt}} \pm \text{random\_jitter}$), we disperse retry traffic uniformly across time, allowing the recovering bank gateway to stabilize gracefully."*

### Q5: What if the client reuses an Idempotency-Key but changes the payment amount?
* **Defensible Answer**:
  > *"That is an idempotency violation. We compute a SHA-256 cryptographic digest of the request payload (amount, currency, recipient, order reference). When an idempotency key is submitted, we compare the incoming payload hash with the stored hash in `idempotency_keys.request_hash`. If the key matches but the hash differs, we immediately reject the request with `HTTP 422 Unprocessable Entity` and a descriptive error message indicating payload mutation."*

### Q6: What prevents your background workers from picking up the same payment concurrently?
* **Defensible Answer**:
  > *"In our single-instance deployment, state transitions use atomic database updates with status guards (e.g., `UPDATE payments SET status = 'PROCESSING' WHERE id = :id AND status = 'INITIATED'`). If two worker threads attempt to claim the same payment, only one row update succeeds. In a distributed multi-node production deployment, this is extended using Redis distributed locks (Redlock) or PostgreSQL `FOR UPDATE SKIP LOCKED` row locking."*

### Q7: What happens if the `PaymentProcessingService` crashes while a payment is in `PROCESSING`?
* **Defensible Answer**:
  > *"We built an autonomous `StaleProcessingWorker` that runs every 15 seconds. It queries for any payment whose status is `PROCESSING` and whose `updated_at` timestamp is older than 60 seconds. Since no legitimate bank call takes over 60 seconds (our client timeout is 2 seconds), an orphaned `PROCESSING` payment indicates a thread crash or unexpected server termination. The worker safely transitions the payment to `UNKNOWN`, dispatches an audit event, and hands it over to the `PaymentReconciliationWorker` to check with the bank."*

### Q8: What if the bank's reconciliation status endpoint is ALSO down or unreachable?
* **Defensible Answer**:
  > *"The payment remains safely quarantined in `UNKNOWN`. The reconciliation worker continues polling with exponential backoff up to a maximum timeout threshold (e.g., 2 hours). If the bank cannot confirm the status within the threshold, the transaction transitions to `DEAD_LETTERED`. This alerts human operations personnel on the Admin Console for manual verification, ensuring that automated code never makes an unverified financial decision."*

### Q9: How do you handle Server-Sent Events (SSE) when the database transaction rolls back?
* **Defensible Answer**:
  > *"We avoid broadcasting 'phantom events' by utilizing Spring's `TransactionSynchronizationManager.registerSynchronization` with the `afterCommit` hook. When a payment state transition occurs inside a `@Transactional` boundary, the SSE event is held in a thread-local queue. Only after PostgreSQL successfully completes its two-phase ACID commit does the `afterCommit` callback release the event to the `PaymentEventHub`. If the database rolls back, the SSE event is discarded, preventing clients from ever seeing false state updates."*

### Q10: How do you protect your Admin endpoints against brute-force password guessing?
* **Defensible Answer**:
  > *"We implemented `LoginRateLimiter`, an in-memory sliding-window rate limiter. It tracks failed authentication attempts keyed by client IP address. If an IP exceeds 5 failed login attempts within a 15-minute rolling window, all subsequent attempts from that IP are blocked with `HTTP 429 Too Many Requests`. To prevent attackers behind a reverse proxy (like Cloudflare or Render) from locking out all users sharing the proxy's IP, we configure `server.forward-headers-strategy: framework` and extract the real client IP from the first entry of the `X-Forwarded-For` or `X-Real-IP` header."*

### Q11: Why did you use Server-Sent Events (SSE) instead of WebSockets?
* **Defensible Answer**:
  > *"Payment status updates are strictly unidirectional: the server broadcasts status updates to the client. WebSockets provide full-duplex communication, which introduces unnecessary complexity, custom framing protocols, and firewall traversal challenges. SSE operates over standard HTTP/1.1 and HTTP/2, supports automatic browser reconnection natively, works seamlessly through corporate firewalls, and consumes significantly less memory on the server."*

### Q12: How is PCI-DSS compliance addressed in your architecture?
* **Defensible Answer**:
  > *"We enforce a strict Zero Credential Custody policy. Our database schemas (`public.payments` and `bank.bank_accounts`) store zero Primary Account Numbers (PAN), CVVs, or card expiration dates. Instead, transactions reference pre-tokenized payment method identifiers (`pm_card_demo`) or masked account strings. Because sensitive authentication data never touches our application servers or persistent storage, our system falls under the lowest PCI-DSS compliance scope (SAQ A)."*

### Q13: What is the purpose of the `payment_attempts` table?
* **Defensible Answer**:
  > *"The `payments` table maintains the current macroscopic state of the order, while `payment_attempts` is an append-only ledger tracking every individual HTTP call made to the bank for that payment. Each attempt records the attempt number, timestamp, request latency in milliseconds, HTTP response code, and any raw bank error message. This separation enables detailed latency telemetry (Average and P95 latency calculations) and forensic dispute resolution."*

### Q14: How does the Customer Mobile PWA handle offline network drops on the client device?
* **Defensible Answer**:
  > *"Our customer mobile app (`MobilePayPage.jsx`) implements client-side retry resilience with an internal retry loop. If the user's phone temporarily loses cellular signal before reaching our server, the client retries up to 3 times with exponential backoff using the exact same `Idempotency-Key`. Once the request reaches our server, the server takes ownership of reliability, and the client switches to listening to the live SSE stream (`/api/payments/{id}/stream`)."*

### Q15: What are the main limitations of this project that you would address in a production banking rollout?
* **Defensible Answer**:
  > *"We document our limitations transparently in `docs/KNOWN_LIMITATIONS.md`. First, our current idempotency lock is backed by a single PostgreSQL database instance; for global active-active multi-region deployment, we would migrate to Redis Redlock or CockroachDB distributed locks. Second, our reconciliation grace period introduces an average latency trade-off of 5–20 seconds for timed-out transactions, which is standard in banking (e.g., UPI pending resolution) but requires clear UI communication. Third, for massive volume (100,000+ RPS), we would replace `@Scheduled` Spring workers with an asynchronous event mesh such as Apache Kafka or RabbitMQ."*

---

## 7. System Diagrams & Visual Assets Index

All diagrams are authored in standard Mermaid format and stored in [`docs/handoff/diagrams/`](handoff/diagrams/README.md). You can copy the code directly into [Mermaid Live Editor](https://mermaid.live) to download high-res PNG or SVG files for your slides and report.

| Diagram Name | File Path | What It Explains | Recommended Placement |
| :--- | :--- | :--- | :--- |
| **System Architecture** | [`architecture.mmd`](handoff/diagrams/architecture.mmd) | 4-tier overview: Client PWA, Spring Service, PostgreSQL, Mock Bank. | Report Chapter 3 / Slide 4 |
| **7-State Payment Machine** | [`payment_state_machine.mmd`](handoff/diagrams/payment_state_machine.mmd) | Complete deterministic lifecycle and transition conditions. | Report Chapter 4 / Slide 3 |
| **Lost-Response Sequence** | [`lost_response_sequence.mmd`](handoff/diagrams/lost_response_sequence.mmd) | Step-by-step chronology of bank timeout and reconciliation recovery. | Report Chapter 4 / Slide 6 |
| **Database ER Diagram** | [`database_er.mmd`](handoff/diagrams/database_er.mmd) | Complete relational schema for `public` and `bank` schemas. | Report Chapter 5 (Data Design) |
| **SSE Real-Time Flow** | [`sse_realtime_flow.mmd`](handoff/diagrams/sse_realtime_flow.mmd) | Event publishing lifecycle with `afterCommit` hook. | Report Chapter 4 / Slide 7 |

---

## 8. Quick-Start Commands Reference

Run these commands from the repository root:

```bash
# 1. Start the entire Docker Compose stack (PostgreSQL, Redis, Services):
docker compose up -d

# 2. Verify all services are warm and healthy (PowerShell):
powershell -ExecutionPolicy Bypass -File scripts/wake.ps1

# 3. Run Payment Service automated test suite (69 tests):
cd backend/payment-service && mvn test

# 4. Run Mock Bank automated test suite (9 tests):
cd backend/mock-bank && mvn test

# 5. Build and validate Frontend production bundle:
cd frontend && npm run build

# 6. Execute End-to-End Acceptance Verification (Double-Submit & Idempotency):
node scripts/verify_acceptance.js

# 7. Run Triplicate Benchmark Replications (Generates raw JSON & CSV):
node scripts/run_handoff_benchmarks.js

# 8. Start Frontend local development server:
cd frontend && npm run dev
```

---
*Document maintained by the ReliablePay Engineering Team. For questions or updates, consult [`docs/handoff/FACTS_SHEET.md`](handoff/FACTS_SHEET.md).*

