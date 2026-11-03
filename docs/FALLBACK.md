# ReliablePay — Local Demonstration Fallback Guide (Review 3 Evaluation)

If cloud infrastructure (Render or Vercel) experiences network outages, cold start timeouts, or free-tier rate limiting during Review 3, execute this **Local Docker Compose Fallback** to run the complete end-to-end system on localhost in under 90 seconds.

---

## 1. Fast Emergency Start (Under 90 Seconds)

### Step 1: Launch Backend Microservices & Database
From the root of the repository:

```bash
docker compose up -d
```

This starts 4 containers in the background:
- `db`: PostgreSQL 16 on port `5432` (persistent data volume `pgdata`)
- `redis`: Redis 7 on port `6379`
- `mock-bank`: Mock Bank Gateway on port `8081` (with chaos & failure simulation)
- `payment-service`: ReliablePay Core Engine on port `8080` (Spring Boot 3.3)

### Step 2: Verify Backend Readiness
Run the automated wake script:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/wake.ps1 -PaymentServiceUrl http://localhost:8080 -MockBankUrl http://localhost:8081
```

Or verify with manual curl commands:
```bash
# Payment Service Health
curl -s http://localhost:8080/actuator/health
# Expected: {"status":"UP"}

# Mock Bank Health
curl -s http://localhost:8081/actuator/health
# Expected: {"status":"UP"}

# System Inter-service Wake Check
curl -s http://localhost:8080/api/system/wake
# Expected: {"mockBank":"UP","paymentService":"UP"}
```

### Step 3: Launch Frontend Application
In a separate terminal window:

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server will start instantly at:
👉 **`http://localhost:5173/`**

---

## 2. Seed Demo Benchmark Data

Run the automated preparation routine to reset any stale data, apply the official **Demo Chaos Preset** (30% bank timeouts, 10% HTTP 500 errors, 500ms latency), and execute the 60-order head-to-head benchmark trial:

```bash
node scripts/prepare_demo.js
```

### Expected Terminal Output:
```
======================================================================
ReliablePay — Automated Demo Preparation Routine
Target: http://localhost:8080
======================================================================

[1/4] Resetting system database (purging old transactions & charges)...
✓ Database purged successfully.

[2/4] Applying Demo chaos preset to Mock Bank...
✓ Demo chaos applied: 30% timeouts, 10% errors, 500ms latency.

[3/4] Launching Quick 60 benchmark trial (count=60, concurrency=10, dupRate=0.2)...
✓ Experiment started with ID: <uuid>

[4/4] Polling experiment progress...
✓ Experiment finished in ~65000 ms.

======================================================================
BENCHMARK EVALUATION RESULTS
======================================================================
NAIVE Duplicate Orders:     14 debited multiple times (₹1800.00 lost)
PROTECTED Duplicate Orders: 0 (Zero financial loss: ₹0.00)
Prevented Overcharges:      ₹1800.00
Direct Comparison URL:      http://localhost:5173/admin/compare/<uuid>
======================================================================
```

---

## 3. Direct Fallback Navigation Links

Once the local stack is running, all Review 3 features work identically to the cloud deployment:

- **Executive Landing Page**: [http://localhost:5173/](http://localhost:5173/)
- **Customer Mobile PWA**: [http://localhost:5173/app](http://localhost:5173/app)
- **Admin Console Login**: [http://localhost:5173/admin/login](http://localhost:5173/admin/login)
- **Admin Live Pipeline Monitor**: [http://localhost:5173/admin](http://localhost:5173/admin)
- **Payments Transactions Ledger & Drawer**: [http://localhost:5173/admin/payments](http://localhost:5173/admin/payments)
- **Chaos Engineering Lab**: [http://localhost:5173/admin/lab](http://localhost:5173/admin/lab)
- **Side-by-Side Protocol Compare**: [http://localhost:5173/admin/compare](http://localhost:5173/admin/compare)
- **OpenAPI 3.0 / Swagger UI**: [http://localhost:8080/swagger-ui/index.html](http://localhost:8080/swagger-ui/index.html)

---

## 4. Teardown & Reset Commands

To stop all local containers after the review:

```bash
# Stop containers without losing database records:
docker compose down

# Stop containers and purge all database records for clean restart:
docker compose down -v
```
