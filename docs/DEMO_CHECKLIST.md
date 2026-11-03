# ReliablePay — Pre-Demo Wake-Up Routine & Review 3 Checklist

This checklist guarantees a smooth, zero-surprise live demonstration during technical reviews and panel evaluations for **Review 3** (November 2026). It keeps an honest history of earlier evaluations (Review 1: core engine; Review 2: UI redesign and protocol benchmark).

---

## 1. Cloud Free-Tier Cold Start Profile (Render + Vercel)

| Metric | Measured Value | Operational Behavior |
| :--- | :---: | :--- |
| **Render Idle Inactivity Window** | **15 minutes** | After 15 minutes of zero inbound traffic, Render spins down container instances to 0 instances. |
| **Cold Start Wake-up Latency** | **55 – 82 seconds** | The initial inbound request triggers container provisioning, JVM launch (`eclipse-temurin:17-jre`), HikariCP connection pool initialization, and Flyway schema verification. |
| **Keep-Alive Grace Period** | **Active while polled** | Once awake, subsequent requests respond within **15 – 35 ms**. |
| **Vercel Frontend Latency** | **< 150 ms (Edge)** | Static assets cached globally on edge CDN; instant initial load. |

---

## 2. Pre-Demo Wake-Up Timeline (What to Open & When)

### **T-10 Minutes: Run the Automated Wake-Up Script**
Render free-tier instances sleep when idle. Always wake the services before the evaluation panel convenes.

1. **Option A (Recommended — Automated PowerShell Wake-up)**:
   Run [`scripts/wake.ps1`](file:///c:/Users/Admin/Downloads/payment-reliability-system/payment-reliability-system/scripts/wake.ps1):
   ```powershell
   # Cloud deployment wake:
   powershell -ExecutionPolicy Bypass -File scripts/wake.ps1

   # Or when testing against localhost fallback:
   powershell -ExecutionPolicy Bypass -File scripts/wake.ps1 -PaymentServiceUrl http://localhost:8080 -MockBankUrl http://localhost:8081
   ```
   - Automatically issues wake triggers to `/api/system/wake` and `/actuator/health`.
   - Polls every 3 seconds with timestamps until both `Payment Service` and `Mock Bank` report status **UP**.
   - Displays real elapsed duration so you know exactly when the backend is hot.

2. **Option B (Browser Wake-up)**:
   - Open `https://<your-vercel-url>.vercel.app/` (or your active Vercel / local URL).
   - The top banner will display: `Engine Initializing... Waking cloud instance`.
   - Wait until the pill badge turns green: `Engine UP`.

### **T-5 Minutes: Seed Live Benchmark Demonstration Data**
Ensure the latest benchmark run and comparative charts are freshly populated:

1. In the browser, navigate to the **Chaos Lab** (`/admin/lab`).
2. Click the **"Prepare Demo (Reset + 60 Txns)"** button.
   - *Step 1/3*: Purges old demo records and resets state.
   - *Step 2/3*: Configures the **Demo Chaos Preset** (30% timeouts, 10% errors, 500ms latency).
   - *Step 3/3*: Dispatches a live 60-transaction head-to-head benchmark run.
3. *Alternative via CLI*:
   ```bash
   node scripts/prepare_demo.js
   ```
4. Verify the benchmark run completes (`status: DONE` in ~60-75s) and redirects to `/admin/compare`.

### **T-1 Minute: Stage Presentation Browser Tabs**
Open and organize the presentation tabs:
- **Tab 1**: Landing Page (`/`) — Hero value proposition, team attribution, and QR code to `/app`.
- **Tab 2**: Customer Mobile App (`/app`) — Simulated smartphone shell, 4 merchants, keypad, client retry demo.
- **Tab 3**: Admin Live Monitor (`/admin`) — Real-time SSE pipeline board, counters, event ticker, throughput chart.
- **Tab 4**: Payments Ledger (`/admin/payments`) — Transactions list, idempotency filter, and payment audit drawer.
- **Tab 5**: Protocol Comparison (`/admin/compare`) — Side-by-side empirical proof of zero duplicate debits.

---

## 3. Five-Minute Live Panel Flow for Review 3

| Minute | Screen | Key Demonstration | Talking Points |
| :---: | :--- | :--- | :--- |
| **0:00 - 1:00** | Landing Page (`/`) | Hero journey stepper, team attribution (Alliance University × Citi), and mobile app QR code. | "In distributed payments, network timeouts are inevitable, but customer double-debits are catastrophic. ReliablePay implements an idempotent 7-state machine, client resilience, and automated status reconciliation." |
| **1:00 - 2:00** | Mobile App (`/app`) | Select Swiggy Express, enter ₹350, click **Pay ₹350**. Show the Progress Screen (`/app/progress/:id`). | "The mobile app connects to `GET /api/payments/{id}/stream` via SSE. Notice the live attempt counter, the 'You will not be charged twice' guarantee badge, and the friendly stepper. If the bank hangs, it quarantines in `UNKNOWN` rather than blind retry." |
| **2:00 - 3:00** | Client Resilience Demo | Toggle **"Simulate lost response"** on `/app`. Submit payment. | "Here we simulate network failure after bank debit. The client retries safely with the exact same `Idempotency-Key`. The backend detects the lease and returns the existing payment with 0 duplicate debits." |
| **3:00 - 4:00** | Admin Live Monitor (`/admin`) | Show the live pipeline board with columns `INITIATED` → `PROCESSING` → `RETRYING` → `UNKNOWN` → `SUCCESS` / `DEAD_LETTERED`. | "The Live Monitor subscribes to `GET /api/admin/stream`. As transactions transition in PostgreSQL, cards animate across columns in real-time with Framer Motion, alongside a 50-event ticker and 60-second throughput chart." |
| **4:00 - 5:00** | Compare Page (`/admin/compare`) | Show comparative cards, duplicate charges chart, and latency profiles from the 60-order run. | "Under identical 30% timeout chaos, NAIVE mode caused multiple duplicate charges (overbilling the user). PROTECTED mode achieved **EXACTLY ZERO DUPLICATES** and 100% loss prevention." |

---

## 4. Post-Demo State
Leave the system in the **Demo Chaos Preset** (`timeoutRate: 0.3`, `errorRate: 0.1`) so examiners or audience members can test interactive payment submissions via the mobile app.
