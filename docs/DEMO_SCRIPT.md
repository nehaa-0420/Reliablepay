# ReliablePay — 3-Minute Live Demonstration Script

This script provides an exact, click-by-click walkthrough for evaluating the ReliablePay fault-tolerant payment processing system in a live 3-minute panel demonstration.

---

## Prerequisites (0:00)
- Ensure Docker Compose is running:
  - Frontend: `http://localhost:5173`
  - Payment Service: `http://localhost:8080/actuator/health` (UP)
  - Mock Bank: `http://localhost:8081/actuator/health` (UP)

---

## Minute 1: The Idempotency & Zero Double-Debit Guarantee (Dashboard)

### Step 1.1: Open the Dashboard
- **Click**: Open browser to `http://localhost:5173/dashboard`.
- **Expected Result**:
  - Live metric cards load at the top: Total Payments, Success Rate, Active Retries, Unknown Status, and Latency Metrics.
  - The payments ledger displays existing transactions or empty state.

### Step 1.2: Trigger Duplicate Submission ("Send Twice at Once")
- **Click**: Click the blue **"+ New Payment"** button in the top right.
- **Action**: In the payment drawer:
  - Amount: `₹500.00`
  - Order Ref: `ORD-DEMO-01`
  - Merchant Ref: `MERCH-DEMO-01`
  - Mode: `PROTECTED` (selected by default)
- **Click**: Click the **"Send Twice at Once"** button (or click submit twice rapidly).
- **Expected Result**:
  - **First Call**: Returns `201 Created` with a new payment UUID. State transitions to `PROCESSING` -> `SUCCESS`.
  - **Second Call**: Detects identical idempotency key and payload hash, bypasses core bank debit, and immediately returns `200 OK` with the **exact same payment UUID**.
  - **Ledger Verification**: Only **ONE** payment record appears in the table. The bank was debited **once**, avoiding customer overcharge.

---

## Minute 2: Network Chaos & Ambiguity Injection (Chaos Lab)

### Step 2.1: Open Chaos Lab
- **Click**: Click **"Chaos Lab"** in the top navigation bar (`/chaos`).
- **Expected Result**:
  - Chaos parameter sliders appear: Timeout Rate, Server Error Rate, Channel Failure (503), Network Latency, and Charge on Timeout Probability.

### Step 2.2: Launch Quick Benchmark Run
- **Click**: Click the **"Quick Run (50 Orders)"** preset button.
- **Verify Settings**:
  - Orders: `50`
  - Concurrency: `10`
  - Timeout Rate: `30%` (simulates "charged-but-response-lost")
  - Error Rate: `10%`
- **Click**: Click the large **"Launch Benchmark"** button.
- **Expected Result**:
  - System executes the identical 50-order workload through both protocols:
    1. Phase 1: NAIVE protocol (blind retries on error/timeout).
    2. Phase 2: PROTECTED protocol (7-state machine + reconciliation worker).
  - A real-time progress bar shows experiment status `RUNNING` and automatically navigates to `/compare` upon completion (~35-45 seconds).

---

## Minute 3: Empirical Head-to-Head Proof (Compare Page & Audit Trail)

### Step 3.1: Verify Zero Overbilling on Compare Page
- **Screen**: `/compare` displays the benchmark comparison report.
- **Verify Metrics**:
  - **Duplicate Orders Charged**:
    - **NAIVE Mode**: Shows **14–18 duplicate orders** charged at the bank ledger.
    - **PROTECTED Mode**: Shows **EXACTLY 0 duplicate orders** (100% elimination of double debits).
  - **Overcharged Amount**:
    - **NAIVE Mode**: Shows **₹2,000 – ₹2,800** in unauthorized customer overbilling.
    - **PROTECTED Mode**: Shows **₹0.00** financial loss.
  - **Orders Succeeded**: PROTECTED achieves higher order completion due to controlled exponential backoff.
  - **Charts**: Visual bar charts show dramatic contrast between NAIVE and PROTECTED.

### Step 3.2: Inspect the Payment Event Audit Trail
- **Click**: Return to `/dashboard` and click on any payment that transitioned through `UNKNOWN`.
- **Expected Result**:
  - The side drawer opens showing the complete immutable audit trail:
    1. `INITIATED`: Payment created with idempotency key.
    2. `PROCESSING`: Leased by background worker.
    3. `UNKNOWN`: Bank read timed out after 2000ms. Payment held in grace period.
    4. `SUCCESS`: Reconciled with bank (`GET /bank/status/{id}`) confirming charge settled.
- **Conclusion**:
  - Zero duplicate debits, zero financial discrepancy, fully auditable state machine.
