# ReliablePay — Pre-Demo Wake-Up Routine & Review Checklist

This checklist guarantees a smooth, zero-surprise live demonstration during technical reviews and panel evaluations.

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

### **T-10 Minutes: Trigger Service Awakening**
Render free-tier instances may be asleep. Do not wait until the panel arrives to make the first request.

1. **Option A (Automated Wake-up Command)**:
   ```bash
   # Ping both services simultaneously via the system wake endpoint:
   curl -I "https://reliablepay-payment-service.onrender.com/api/system/wake"
   curl -I "https://reliablepay-mock-bank.onrender.com/actuator/health"
   ```
2. **Option B (Browser Wake-up)**:
   - Open `https://reliablepay-frontend.vercel.app/` (or your active Vercel deployment URL).
   - The top banner will display: `Engine Initializing... Waking cloud instance`.
   - Wait until both pill badges turn green: `Payment Service UP` & `Mock Bank UP`.

### **T-5 Minutes: Seed Live Benchmark Demonstration Data**
Ensure the latest benchmark run and comparative charts are freshly populated:

1. In the browser, navigate to the **Chaos Lab** (`/lab`).
2. Click the **"Prepare Demo (Reset + 60 Txns)"** button.
   - *Step 1/3*: Purges old demo records and resets state.
   - *Step 2/3*: Configures the **Demo Chaos Preset** (30% timeouts, 10% errors, 500ms latency).
   - *Step 3/3*: Dispatches a live 60-transaction head-to-head benchmark run.
3. *Alternative via CLI*:
   ```bash
   node scripts/prepare_demo.js
   ```
4. Verify the benchmark run completes (`status: DONE` in ~60-75s) and redirects to `/compare`.

### **T-1 Minute: Stage Presentation Browser Tabs**
Open and organize the following four tabs in order:
- **Tab 1**: Landing Page (`/`) — Architecture flow and value proposition.
- **Tab 2**: Operational Dashboard (`/dashboard`) — Live ledger and payment drawer.
- **Tab 3**: Chaos Lab (`/lab`) — Network fault injection controls and presets.
- **Tab 4**: Protocol Comparison (`/compare`) — Side-by-side empirical proof of zero duplicates.

---

## 3. Five-Minute Live Panel Flow

| Minute | Screen | Key Demonstration | Talking Points |
| :---: | :--- | :--- | :--- |
| **0:00 - 1:00** | Landing Page (`/`) | Hero journey stepper, system telemetry banner, and animated architecture SVG. | "In distributed payments, network timeouts are inevitable, but customer double-debits are catastrophic. ReliablePay implements an idempotent 7-state machine and automated status reconciliation." |
| **1:00 - 2:00** | Dashboard (`/dashboard`) | Click **"New Payment"**, enter ₹500, check **"Send twice at once"**, submit. | "When duplicate submissions occur concurrently, the second request safely matches the Idempotency-Key digest, avoiding duplicate bank charges and returning HTTP 200 with the exact same payment ID." |
| **2:00 - 3:00** | Payment Drawer | Open the submitted payment from the table. | "Inspect the append-only event trail: `INITIATED` → `PROCESSING` → `SUCCESS`. All transitions are audited with microsecond precision in PostgreSQL." |
| **3:00 - 4:00** | Chaos Lab (`/lab`) | Review the active chaos sliders (30% timeouts, 10% errors). | "We simulate a realistic bank gateway: TCP timeouts where funds may or may not have been debited upstream. Naive retry causes duplicate debits; ReliablePay quarantines in `UNKNOWN`." |
| **4:00 - 5:00** | Compare Page (`/compare`) | Show comparative cards, duplicate charges chart, and latency profiles. | "Under identical chaos, NAIVE mode caused 14 duplicate charges (₹1,800 overbilled). PROTECTED mode achieved **EXACTLY ZERO DUPLICATES** and 100% loss prevention." |

---

## 4. Post-Demo State
Leave the system in the **Demo Chaos Preset** (`timeoutRate: 0.3`, `errorRate: 0.1`) so examiners or audience members can test interactive payment submissions.
