# ReliablePay — Academic Project Report & Thesis Outline

> 📖 **Purpose of this Outline**:  
> This document guides report authors, academic thesis editors, and documentation leads. For each chapter, it specifies the **exact repository source files**, **Mermaid architectural diagrams**, and **verified empirical numbers** to use. Follow this outline directly to compile the final project report without writing unverified claims.

---

## Chapter 1: Abstract
* **Purpose**: Executive summary of the problem, proposed solution, and empirical achievements.
* **Exact Repository Files**:
  * [`docs/handoff/FACTS_SHEET.md`](FACTS_SHEET.md) (Section 1: Executive Summary)
  * [`docs/PROJECT_SUMMARY.md`](../PROJECT_SUMMARY.md)
* **Key Figures & Numbers to Quote**:
  * **0 duplicate debits** (`min: 0, max: 0, mean: 0.00`) under 30% bank read timeout chaos.
  * **₹0.00 customer overcharge** vs. mean **₹2,300.00** overcharge in NAIVE mode.
  * **100.0% transaction recovery rate** in PROTECTED mode vs. **89.7%** in NAIVE mode.
  * **78 automated test cases passing (100% pass rate)**.
* **Diagrams**: None (Abstract text only).

---

## Chapter 2: Introduction
* **Purpose**: Contextualize modern digital payments, banking clearing houses, and the rise of mobile payment volume (UPI, credit cards, digital wallets).
* **Exact Repository Files**:
  * [`docs/PROJECT_SUMMARY.md`](../PROJECT_SUMMARY.md)
  * [`docs/TEAM_HANDOFF.md`](../TEAM_HANDOFF.md) (Section 2: Plain English Model)
* **Key Concepts**:
  * Decoupling customer checkout from bank settlement.
  * Mobile network unreliability (tunnel drops, Wi-Fi switching, cellular latency spikes).
  * High-level Citi industry brief deliverables.

---

## Chapter 3: Problem Statement
* **Purpose**: Formal mathematical and distributed systems definition of the "Lost-Response" dilemma (Two Generals' Paradox in financial systems).
* **Exact Repository Files**:
  * [`docs/REVIEW_PACK.md`](../REVIEW_PACK.md) (Section 1 & Section 3)
  * [`docs/handoff/diagrams/lost_response_sequence.mmd`](diagrams/lost_response_sequence.mmd)
* **Diagram to Embed**:
  * **Figure 3.1**: Sequence Diagram of the "Lost-Response" Dilemma ([`docs/handoff/diagrams/lost_response_sequence.mmd`](diagrams/lost_response_sequence.mmd)).
* **Analytical Description**:
  * Explain why HTTP status codes 504 Gateway Timeout and TCP socket timeouts are ambiguous: the bank server may have committed the transaction before the socket closed.
  * Detail why naive blind retry loops cause catastrophic double debits (charging customers multiple times for a single order).

---

## Chapter 4: Literature Review & Related Work
* **Purpose**: Survey existing foundational research on distributed transaction reliability, backoff algorithms, and audit integrity.
* **Exact Repository Files**:
  * [`docs/LITERATURE_BASE_PAPERS.md`](../LITERATURE_BASE_PAPERS.md)
* **Required Literature Review Table**:
  > ⚠️ **Author Action Required**: **NONE of the author limitations below are verified** in this repository (only Paper B2 abstract was inspected during Phase 6). Do **NOT** invent paper gaps. The team must obtain and read the original physical or PDF full-text copies of all three papers to extract authentic bibliographic citations, page numbers, and verbatim limitations stated by the authors into the table below.

| Paper Key | Primary Paper Title | Authors, Year, Venue [To Fill by Team] | Explicit Limitation Stated by Authors [To Fill with Page #] |
| :---: | :--- | :--- | :--- |
| **B1** | *E-Financial Sentinel: Navigating India's Digital Transaction Landscape* | [Author(s), Year, Venue — to fill from paper] | "[Insert verbatim author limitation here with exact page number — to fill from paper]" |
| **B2** | *Statistical and Data Analytics Approaches to Parameter Tuning for QoS of E-Banking Transactions* | [Author(s), Year, Venue — to fill from paper] | "[Insert verbatim author limitation here with exact page number — to fill from paper]" |
| **B3** | *Failure Propagation in SAP MultiBank Payment Batches Due to Unsynchronized Secure Channel Negotiations* | [Author(s), Year, Venue — to fill from paper] | "[Insert verbatim author limitation here with exact page number — to fill from paper]" |


---

## Chapter 5: Project Objectives & Requirements
* **Purpose**: Map high-level project goals to Citi's specification matrix.
* **Exact Repository Files**:
  * [`docs/BUILD_PLAN.md`](../BUILD_PLAN.md)
  * [`docs/handoff/FACTS_SHEET.md`](FACTS_SHEET.md) (Section 6: Citi Brief Mapping Matrix)
* **Key Requirements Covered**:
  1. Persistent ACID transaction storage.
  2. Cryptographic idempotency enforcement.
  3. 7-state finite state machine mapping to Citi's 3-state specification (Pending, Success, Failed).
  4. Core banking simulator with configurable chaos.
  5. Two-phase bank status reconciliation.
  6. Operator real-time telemetry streaming (SSE).

---

## Chapter 6: System Design & Architecture
* **Purpose**: In-depth design of the multi-tier decoupled system, database schema, and deterministic state transitions.
* **Exact Repository Files**:
  * [`docs/handoff/diagrams/architecture.mmd`](diagrams/architecture.mmd)
  * [`docs/handoff/diagrams/payment_state_machine.mmd`](diagrams/payment_state_machine.mmd)
  * [`docs/handoff/diagrams/database_er.mmd`](diagrams/database_er.mmd)
  * [`docs/handoff/diagrams/sse_realtime_flow.mmd`](diagrams/sse_realtime_flow.mmd)
* **Diagrams to Embed**:
  * **Figure 6.1**: End-to-End System Architecture ([`architecture.mmd`](diagrams/architecture.mmd)).
  * **Figure 6.2**: 7-State Payment State Machine ([`payment_state_machine.mmd`](diagrams/payment_state_machine.mmd)).
  * **Figure 6.3**: Relational Database Entity-Relationship Diagram ([`database_er.mmd`](diagrams/database_er.mmd)).
  * **Figure 6.4**: Real-Time SSE Event Pipeline & `afterCommit` Lifecycle ([`sse_realtime_flow.mmd`](diagrams/sse_realtime_flow.mmd)).
* **State Mapping Table**:
  * Include the Citi Brief State (`Pending`, `Success`, `Failed`) to ReliablePay Internal States mapping table from [`docs/handoff/FACTS_SHEET.md`](FACTS_SHEET.md).

---

## Chapter 7: Implementation Details
* **Purpose**: Code-level documentation of algorithms, data structures, and security mechanisms.
* **Exact Repository Files**:
  * **Idempotency Service**: [`backend/payment-service/src/main/java/com/reliablepay/payment/service/IdempotencyService.java`](../../backend/payment-service/src/main/java/com/reliablepay/payment/service/IdempotencyService.java)
  * **State Machine Guard**: [`backend/payment-service/src/main/java/com/reliablepay/payment/service/PaymentStateMachine.java`](../../backend/payment-service/src/main/java/com/reliablepay/payment/service/PaymentStateMachine.java)
  * **Backoff Retry Worker**: [`backend/payment-service/src/main/java/com/reliablepay/payment/worker/PaymentRetryWorker.java`](../../backend/payment-service/src/main/java/com/reliablepay/payment/worker/PaymentRetryWorker.java)
  * **Reconciliation Worker**: [`backend/payment-service/src/main/java/com/reliablepay/payment/worker/PaymentReconciliationWorker.java`](../../backend/payment-service/src/main/java/com/reliablepay/payment/worker/PaymentReconciliationWorker.java)
  * **Stale Worker**: [`backend/payment-service/src/main/java/com/reliablepay/payment/worker/StaleProcessingWorker.java`](../../backend/payment-service/src/main/java/com/reliablepay/payment/worker/StaleProcessingWorker.java)
  * **Authentication & Rate Limiting**: [`backend/payment-service/src/main/java/com/reliablepay/payment/auth/LoginRateLimiter.java`](../../backend/payment-service/src/main/java/com/reliablepay/payment/auth/LoginRateLimiter.java), `AdminAuthController.java`
* **Key Formulas to Include**:
  * **SHA-256 Request Hash**:
    $$\text{Hash} = \text{SHA-256}(\text{amount} \parallel \text{currency} \parallel \text{orderRef} \parallel \text{merchantRef})$$
  * **Exponential Backoff with Full Jitter**:
    $$t_{\text{sleep}} = \text{random}(0, \text{baseDelay} \times 2^{\text{attempt}})$$

---

## Chapter 8: Testing & Empirical Evaluation Results
* **Purpose**: Empirical proof validating that ReliablePay eliminates duplicate charges.
* **Exact Repository Files**:
  * [`docs/handoff/results/results_summary.md`](results/results_summary.md)
  * [`docs/handoff/results/results_summary.csv`](results/results_summary.csv)
  * [`docs/EVALUATION.md`](../EVALUATION.md)
  * [`scripts/load_test_results.json`](../../scripts/load_test_results.json)
* **Tables to Include**:
  1. **Table 8.1**: Summary of 3 Replicated Demo Benchmark Runs (NAIVE vs. PROTECTED).
  2. **Table 8.2**: Systematic 9-Configuration Parameter Sweep (Client Timeout, Grace Period, Retry Delay, Max Attempts).
  3. **Table 8.3**: High-Throughput Stress Test Telemetry (100 VUs, Throughput, Latency Percentiles).
* **Test Suite Verification**:
  * Quote the verified **78 / 78 passing tests** (69 in `payment-service`, 9 in `mock-bank`), verified on November 4, 2026.

---

## Chapter 9: Known Limitations & Scope Boundaries
* **Purpose**: Transparent documentation of prototype design trade-offs and hosting boundaries.
* **Exact Repository Files**:
  * [`docs/KNOWN_LIMITATIONS.md`](../KNOWN_LIMITATIONS.md)
  * [`docs/handoff/CLAIMS_REGISTER.md`](CLAIMS_REGISTER.md)
* **Key Subsections**:
  1. Simulated Core Bank Only (no real money, outside PCI scope).
  2. `X-Forwarded-For` rate limiting forgeability without edge header sanitization.
  3. Single-instance in-memory SSE event hub clustering boundaries.
  4. Free-tier cloud container cold starts (50–90 seconds on Render).
  5. Sample size context ($n=3$ replications under fixed 30% timeout chaos).
  6. Latency trade-off of status reconciliation (21–23s MTTR vs zero loss).

---

## Chapter 10: Conclusion & Future Work
* **Purpose**: Summarize project outcomes and outline production scaling roadmaps.
* **Key Conclusions**:
  * ReliablePay conclusively proves that combining database-enforced idempotency, a 7-state deterministic state machine, exponential jitter backoff, and two-phase bank reconciliation eliminates double debits completely (100% reduction).
* **Future Work Directions**:
  1. **Distributed State Locking**: Migrating single-instance PostgreSQL row locks to distributed Redis Redlock or CockroachDB for multi-region active-active deployments.
  2. **Message Mesh Integration**: Replacing `@Scheduled` Spring polling workers with event-driven Apache Kafka consumer groups for massive horizontal throughput.
  3. **Binary Banking Protocols**: Developing an ISO 8583 / ISO 20022 ASN.1 binary gateway adapter.
  4. **Dynamic AI-Driven Grace Period**: Implementing predictive machine learning models to dynamically estimate bank processing latency based on time-of-day clearing congestion.

