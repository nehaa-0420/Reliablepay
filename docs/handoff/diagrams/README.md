# ReliablePay — Architectural & System Diagrams

This directory contains the authoritative Mermaid source files (`.mmd`) for the five primary system diagrams required for the project report, viva defense, and presentation slides.

## Diagram Index

1. **System Architecture** (`architecture.mmd`):
   - High-level multi-tier architecture spanning Client Tier (Customer Mobile PWA, Admin Console, Stress Testing scripts), Service Tier (Spring Boot `payment-service` with controllers, 7-state machine, and 3 background workers), Data Tier (PostgreSQL 16 ACID tables), and Bank Simulation (`mock-bank` with chaos engine and ground-truth ledger).
2. **7-State Payment State Machine** (`payment_state_machine.mmd`):
   - Deterministic payment lifecycle transitions from `INITIATED` through `PROCESSING`, `RETRYING` (exponential backoff with full jitter), `UNKNOWN` (ambiguous timeout grace period), terminal `SUCCESS`, `FAILED`, and `DEAD_LETTERED`.
3. **Lost-Response Sequence Flow** (`lost_response_sequence.mmd`):
   - Step-by-step sequence diagram illustrating the classic distributed systems failure: a payment charge is debited at the bank, but the response is lost in transit. Explains how ReliablePay avoids blind double debits, parks the transaction in `UNKNOWN`, queries the bank status, and settles cleanly to `SUCCESS`.
4. **Database Entity-Relationship (ER)** (`database_er.mmd`):
   - Schema mapping directly derived from real Flyway migrations (`V1__init_payment_tables.sql` in `public` schema and `V1__init_bank_tables.sql` in `bank` schema), including primary keys, foreign keys, unique constraints, and columns.
5. **SSE Real-Time Event Pipeline** (`sse_realtime_flow.mmd`):
   - Asynchronous Server-Sent Events (SSE) streaming architecture using `PaymentEventHub`, `TransactionSynchronization.afterCommit` dispatch, and client-side polling fallback.

---

## How to Export to PNG / SVG

> [!NOTE]
> **mermaid-cli Execution Note**: `mermaid-cli` (`mmdc`) relies on a headless Puppeteer/Chromium browser installation. In this headless/Windows server environment, `mmdc` cannot execute without a display driver.

To export these diagrams to high-resolution PNG or SVG for your report and slides, use one of the two methods below:

### Method 1: Mermaid Live Editor (Zero Installation — Recommended)
1. Copy the contents of any `.mmd` file in this directory.
2. Open [https://mermaid.live](https://mermaid.live) in your browser.
3. Paste the code into the left pane.
4. Click **Download PNG** (or **Download SVG**) at the bottom of the right pane.

### Method 2: Local CLI One-Line Command (If Node.js & Puppeteer are installed)
Run from the repository root:
```bash
# Export all 5 diagrams to PNG:
npx -y @mermaid-js/mermaid-cli -i docs/handoff/diagrams/architecture.mmd -o docs/handoff/diagrams/architecture.png
npx -y @mermaid-js/mermaid-cli -i docs/handoff/diagrams/payment_state_machine.mmd -o docs/handoff/diagrams/payment_state_machine.png
npx -y @mermaid-js/mermaid-cli -i docs/handoff/diagrams/lost_response_sequence.mmd -o docs/handoff/diagrams/lost_response_sequence.png
npx -y @mermaid-js/mermaid-cli -i docs/handoff/diagrams/database_er.mmd -o docs/handoff/diagrams/database_er.png
npx -y @mermaid-js/mermaid-cli -i docs/handoff/diagrams/sse_realtime_flow.mmd -o docs/handoff/diagrams/sse_realtime_flow.png
```
