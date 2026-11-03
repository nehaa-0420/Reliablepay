# ReliablePay — Official Handoff Facts & Metrics Sheet
**Version**: 1.0.0 (Review 3 Final Release)  
**Date of Verification**: November 3, 2026  
**Target Audience**: Report Authors, Presentation Leads, Viva Panel Representatives, QA Auditors  
**Repository Branch**: `main` | **Target Deployment**: Local Docker Compose / Render / Vercel  

---

## 1. Executive Summary & Verification Highlights

This document serves as the **authoritative single source of truth** for all numerical metrics, architectural guarantees, test results, and empirical benchmark findings for **ReliablePay**. All team members drafting documentation, academic thesis chapters, or presentation slide decks must cite the exact figures listed below to prevent contradictory claims.

### Key Headline Figures:
* **Core Safety Invariant**: **Zero Duplicate Orders** charged at the core banking ledger in **PROTECTED** mode across all 3 benchmark replications (`min: 0, max: 0, mean: 0.00`).
* **Zero Customer Financial Loss**: **₹0.00** overcharged under PROTECTED mode vs. a mean overcharge of **₹2,300.00** (`min: ₹1,900.00, max: ₹2,600.00`) in NAIVE mode.
* **Test Suite Verification**: **78 automated tests passing out of 78 (100% pass rate)**.
  * `payment-service`: **69 unit & integration tests** passing.
  * `mock-bank`: **9 unit & integration tests** passing.
* **Final Transaction Success Rate**: **100.0%** in PROTECTED mode under simulated 30% timeout + 10% error chaos vs. **89.7%** in NAIVE mode (+10.3% improvement).
* **Deterministic Payment States**: **7 internal states** (`INITIATED`, `PROCESSING`, `SUCCESS`, `FAILED`, `RETRYING`, `UNKNOWN`, `DEAD_LETTERED`) mapping directly to Citi's 3 high-level specification states (**Pending**, **Success**, **Failed**).

---

## 2. Replicated Benchmark Metrics (3 Consecutive Runs)

The following metrics were gathered on **November 3, 2026** using the automated benchmark script [`scripts/run_handoff_benchmarks.js`](../../scripts/run_handoff_benchmarks.js) running against live instances of `payment-service` and `mock-bank` with full database resets between iterations.

### Benchmark Workload Parameters:
* **Batch Size**: 60 transactions per mode (120 total requests per replication run)
* **Concurrency Level**: 10 parallel client workers
* **Injected Chaos Rates**:
  * Bank Read Timeout Rate: **30%** (2,500 ms delay exceeding 2,000 ms client read timeout)
  * Upstream HTTP 503 Error Rate: **10%**
  * Client Double-Submit Rate: **20%**
  * Base Gateway Latency: **500 ms**

### Statistical Comparison Table:

| Metric | NAIVE Mode (Mean) | NAIVE Mode (Min – Max) | PROTECTED Mode (Mean) | PROTECTED Mode (Min – Max) | Absolute / Relative Improvement |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Duplicate Orders Charged** | **18.33** | 17 – 19 | **0.00** | **0 – 0** | **100% Elimination (18.33 → 0)** |
| **Overcharged Amount (INR)** | **₹2,300.00** | ₹1,900 – ₹2,600 | **₹0.00** | **₹0.00 – ₹0.00** | **₹2,300.00 Protected per 60 orders** |
| **Final Transaction Success Rate** | **89.7%** | 88.0% – 90.9% | **100.0%** | **100.0% – 100.0%** | **+10.3% Success Rate** |
| **Mean Recovery Latency** | 21,803 ms | 20,719 – 23,497 ms | 22,361 ms | 21,492 – 23,117 ms | +558 ms (Reconciliation grace period) |
| **Average End-to-End Latency** | 594.8 ms | 571.6 – 608.5 ms | 694.3 ms | 573.8 – 771.8 ms | +99.5 ms (Audit event persistence) |
| **95th Percentile (P95) Latency**| 2,005.3 ms | 2,005 – 2,006 ms | 2,005.0 ms | 2,004 – 2,006 ms | Identical (~2,000 ms client timeout limit) |

### Individual Replicated Run Logs:

| Run Number | Experiment UUID | NAIVE Duplicates | NAIVE Loss (INR) | PROTECTED Duplicates | PROTECTED Loss (INR) | Total Duration |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: |
| **Run 1** | `7cf1dcce-994e-48e6-b326-930880df4273` | 19 | ₹2,400.00 | **0** | **₹0.00** | 61.1 seconds |
| **Run 2** | `ed7918c9-986f-44c3-b918-ead0da98d6c1` | 19 | ₹2,600.00 | **0** | **₹0.00** | 70.1 seconds |
| **Run 3** | `7d630922-baa0-4a06-b422-f1a8485db5cc` | 17 | ₹1,900.00 | **0** | **₹0.00** | 71.9 seconds |

*Raw data files available in:*
- JSON: [`docs/handoff/results/demo_run_1.json`](results/demo_run_1.json), [`demo_run_2.json`](results/demo_run_2.json), [`demo_run_3.json`](results/demo_run_3.json)
- CSV: [`docs/handoff/results/results_summary.csv`](results/results_summary.csv)
- Markdown Summary: [`docs/handoff/results/results_summary.md`](results/results_summary.md)

---

## 3. High-Throughput Stress Testing & Load Limits

Tested using [`scripts/load_test.js`](../../scripts/load_test.js) and Apache JMeter test profiles:
* **Concurrent Virtual Users (VUs)**: 100 concurrent threads
* **Target Load**: 1,000 sustained requests
* **Peak Throughput**: **280 – 340 requests per second (RPS)** on a single local Spring Boot JVM instance
* **Zero Race-Condition Breaches**: 0 duplicate rows created in `public.payments` or `bank.bank_ledger` under concurrent submissions with identical idempotency keys
* **P99 Latency under Clean Conditions**: < 45 ms
* **Database Connection Pool**: HikariCP configured with 20 maximum connections, 30,000 ms connection timeout

---

## 4. Software Architecture Specifications & Component Count

| Layer | Technology | Key Components / Artifacts |
| :--- | :--- | :--- |
| **Language & Runtime** | Java 21 LTS, Node.js v24.19.0 | JDK 21 Virtual Threads enabled, Modern ES modules |
| **Backend Framework** | Spring Boot 3.3.4 | Spring Web, Spring Data JPA, Spring Validation, Flyway 10 |
| **Primary Database** | PostgreSQL 16 | 2 Schemas (`public` for payment service, `bank` for mock bank) |
| **Caching & Fast Store** | Redis 7 Alpine | Distributed cache / lock coordinator |
| **Frontend Framework** | React 18.3 + Vite 5.4 | React Router DOM v6, Tailwind CSS v3.4, Lucide React, Framer Motion |
| **Real-time Pipeline** | Server-Sent Events (SSE) | Spring `SseEmitter` + `PaymentEventHub` with 15s keep-alive heartbeat |
| **Containerization** | Docker Engine 24+ & Docker Compose | Multi-stage Dockerfiles (`eclipse-temurin:21-jre-alpine`) |

### Background Workers (Autonomous Engine Services):
1. **`PaymentRetryWorker`** (`@Scheduled(fixedDelay = 2000)`):
   - Polls `payments` where `status = 'RETRYING'` and `next_retry_at <= NOW()`.
   - Executes exponential backoff with full jitter formula:
     $$\text{sleep} = \text{base} \times 2^{\text{attempt}} \pm \text{random\_jitter}$$
   - Max retry limit: **3 attempts**.
2. **`PaymentReconciliationWorker`** (`@Scheduled(fixedDelay = 5000)`):
   - Polls ambiguous `UNKNOWN` payments where `updated_at <= NOW() - 5000ms` (grace period).
   - Issues idempotent verification call to Bank Core: `GET /bank/status/{bankReference}`.
   - If bank confirms debit: transitions to `SUCCESS`.
   - If bank confirms no debit: transitions to `RETRYING` or safe refund.
3. **`StaleProcessingWorker`** (`@Scheduled(fixedDelay = 15000)`):
   - Sweeps orphaned payments stuck in `PROCESSING` for > 60 seconds (worker crash / network freeze).
   - Recovers stuck payments into `UNKNOWN` with full audit event dispatch and SSE alerts.

---

## 5. Security & Authentication Inventory

| Security Layer | Implementation Details | Target Endpoints |
| :--- | :--- | :--- |
| **Admin Authentication** | JWT Bearer Tokens signed with HMAC-SHA256 (`AUTH_TOKEN_SECRET`) | `/api/admin/**`, `/api/chaos`, `/api/experiments/**` |
| **Brute-Force Rate Limiting** | `LoginRateLimiter`: Sliding window in-memory tracking (Max **5 failed attempts per 15-minute window**) | `POST /api/auth/admin/login` |
| **Proxy IP Isolation** | Resolves real client IP using `X-Forwarded-For` (first IP) and `X-Real-IP` with `server.forward-headers-strategy: framework` | Prevents reverse proxy IP collision on Render/Cloudflare |
| **Credential Custody** | **Zero Sensitive Cardholder Data (Zero PAN / CVV)**. Uses payment method tokens (`pm_card_demo`) and masked bank account numbers. | Entire Architecture |
| **Timing Attack Resistance** | Constant-time password validation via `MessageDigest.isEqual()` | Admin Auth Controller |
| **CORS Policy** | Whitelisted origin verification (`CORS_ALLOWED_ORIGINS` env var) | All REST & SSE endpoints |

---

## 6. Citi Project Brief Mapping Matrix

| Citi Requirement | ReliablePay Solution | Implementation Proof File |
| :--- | :--- | :--- |
| **Payment Ingestion & Storage** | ACID PostgreSQL storage with UUID identifiers and JSON payload metadata | `Payment.java`, `V1__init_payment_tables.sql` |
| **Strict Idempotency** | Cryptographic SHA-256 payload digest + database unique constraint on `(user_id, idempotency_key)` | `IdempotencyService.java`, `idempotency_keys` table |
| **Failure State Management** | 7-state deterministic finite state machine with strict illegal transition rejection | `PaymentStateMachine.java`, `PaymentState.java` |
| **Bank Gateway & Chaos Simulator** | Standalone banking service with dynamic read timeout, HTTP 503, and latency sliders | `mock-bank/BankService.java`, `BankController.java` |
| **Ambiguous State Resolution** | Two-phase reconciliation querying ground-truth bank ledger | `PaymentReconciliationWorker.java`, `BankLedgerRepository.java` |
| **Real-time Operator Telemetry** | Server-Sent Events streaming real-time status transitions to React dashboard | `PaymentEventHub.java`, `AdminLiveMonitorPage.jsx` |
| **Audit Compliance** | Append-only transaction event log with millisecond timestamps and error codes | `payment_events` table, `PaymentEvent.java` |

---

## 7. Diagram Cross-Reference Guide

The architectural diagrams are available in high-resolution Mermaid format inside [`docs/handoff/diagrams/`](diagrams/README.md):

1. **`architecture.mmd`**: Multi-tier architecture spanning Client PWA, Spring Boot Service Tier, PostgreSQL Data Tier, and Bank Simulator.
2. **`payment_state_machine.mmd`**: Complete 7-state transition lifecycle from `INITIATED` to `SUCCESS`/`FAILED`/`DEAD_LETTERED`.
3. **`lost_response_sequence.mmd`**: Detailed chronological interaction of the "Lost-Response" network timeout and reconciliation recovery.
4. **`database_er.mmd`**: Complete relational schema matching Flyway migration scripts across `public` and `bank` schemas.
5. **`sse_realtime_flow.mmd`**: Event publication lifecycle with `TransactionSynchronization.afterCommit` dispatch to connected SSE clients.
