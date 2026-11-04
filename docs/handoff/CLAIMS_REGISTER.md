# ReliablePay — Official Claims & Evidence Register
**Date of Audit**: November 4, 2026  
**Auditor**: Anti-Hallucination & System Verification Suite  
**Scope**: All claims made across `README.md`, `docs/REVIEW_PACK.md`, `docs/TEAM_HANDOFF.md`, and `docs/handoff/FACTS_SHEET.md`.

---

## 1. Verification Classification Standard

Every architectural, empirical, security, or deployment claim is strictly categorized as:
* **VERIFIED**: Directly proven by a reproducible terminal command, passing test output, or committed telemetry log file present in the repository.
* **NOT VERIFIED**: Speculative, untested in an end-to-end browser environment, dependent on unlinked third-party cloud infrastructure, or not backed by empirical output.

---

## 2. Complete Claims Verification Matrix

| ID | Document | Claim Description | Evidence File / Command | Status | Notes & Audit Remarks |
| :---: | :--- | :--- | :--- | :---: | :--- |
| **C01** | `README.md`, `FACTS_SHEET.md` | Core Safety Invariant: Exactly 0 duplicate orders charged at the core banking ledger in PROTECTED mode under 30% timeout chaos (`min: 0, max: 0`). | `docs/handoff/results/demo_run_1.json`, `demo_run_2.json`, `demo_run_3.json`, `scripts/run_handoff_benchmarks.js` | **VERIFIED** | Replicated 3 consecutive times with full database reset. 0 duplicate debits in all runs. |
| **C02** | `README.md`, `FACTS_SHEET.md` | Zero Customer Financial Loss: ₹0.00 customer loss under PROTECTED mode vs mean ₹2,300 overcharge in NAIVE mode. | `docs/handoff/results/results_summary.md`, `results_summary.csv` | **VERIFIED** | NAIVE produced ₹2,400 (Run 1), ₹2,600 (Run 2), ₹1,900 (Run 3); PROTECTED produced ₹0.00 in all 3 runs. |
| **C03** | `README.md`, `FACTS_SHEET.md` | Test Suite Pass Rate: 78 tests passing out of 78 (100% pass rate). | `mvn test` in `backend/payment-service` (69 tests) and `backend/mock-bank` (9 tests) | **VERIFIED** | Executed Nov 4, 2026. 69 payment-service tests + 9 mock-bank tests = 78 tests passed, 0 failures, 0 errors. |
| **C04** | `README.md` | Frontend Production Build compiles with 0 errors/warnings and code splits routes. | `npm run build` in `frontend`, `docs/handoff/evidence/npm_build.txt` | **VERIFIED** | Vite v5.4.14 transformed 3,207 modules into production bundles in ~24s (`ComparePage`: 392.33 kB, `index`: 339.77 kB, `PWA v2.0.0` generated workbox SW with 50 precache entries). |
| **C05** | `FACTS_SHEET.md`, `TEAM_HANDOFF.md` | High-Throughput Stress Test: ~65.7 to 102.1 req/sec sustained throughput under 100 concurrent virtual users. | `node scripts/load_test.js`, `docs/handoff/evidence/load_test.txt`, `load_test_results.json` | **VERIFIED** | Measured 65.72 req/sec sustained throughput (1,699 requests, 787 successful 201s, 912 rejected with 500 due to async thread pool 500-slot queue saturation under 100 concurrent VUs, P95 1,879 ms, P99 2,505 ms). Earlier Phase 6 run recorded 102.10 req/sec (2,740 requests, P95 2,054 ms). |
| **C06** | `FACTS_SHEET.md` (Earlier Draft) | Peak Throughput of 280–340 RPS, <45 ms P99 latency under 100 concurrent VUs. | None (Speculative estimation removed from documentation) | **NOT VERIFIED** | **REMOVED**. No execution run produced >200 RPS or <45 ms P99 under 100 VUs. Current verified throughput is 65.7–102.1 req/s. |
| **C07** | `README.md`, `DEPLOYMENT.md` | Public Cloud Live Deployment active on Render (`reliablepay-*.onrender.com`) and Vercel (`*.vercel.app`). | HTTP requests to Render / Vercel subdomains (returned HTTP 404 / no-server) | **NOT VERIFIED** | Cloud infrastructure manifests (`render.yaml`, `vercel.json`) are prepared, but user accounts have not linked the repository. See `docs/DEPLOYMENT.md` as single source of truth. |
| **C08** | `REVIEW_PACK.md`, `FINAL_REPORT.md` | Customer Mobile PWA: "Simulate lost response" toggle in the real `/app` browser UI. | Scripted tests (`test_mobile_api.js`) tested the backend `/api/payments` chaos payload directly | **NOT VERIFIED** | Toggle is located in `/app` (Settings toggle "Simulate Lost Response"). Expected UI behavior: client simulates dropped first response, issues safe retry with identical Idempotency-Key, progress screen finishes as "Paid" (200 OK replay), and admin Payments list shows exactly ONE new payment. (Note: UNKNOWN is a different scenario caused by bank timeouts in Chaos Lab). End-to-end browser clicking of the toggle switch requires manual verification. |
| **C09** | `REVIEW_PACK.md`, `FINAL_REPORT.md` | Admin Console operations after token removal (Chaos Lab Apply, Run Experiment, Requeue). | Scripted login via `scripts/verify_live_streams.js` and `scripts/run_handoff_benchmarks.js` | **NOT VERIFIED** | Backend JWT authentication and CLI token endpoints are verified; manual interactive clicking of the Admin Web UI forms post-token removal has not been automated. |
| **C10** | `README.md`, `REVIEW_PACK.md` | Base research paper theoretical gaps across papers B1, B2, and B3: (1) E-Financial Sentinel: Navigating India's Digital Transaction Landscape; (2) Statistical and Data Analytics Approaches to Parameter Tuning for QoS of E-Banking Transactions; (3) Failure Propagation in SAP MultiBank Payment Batches Due to Unsynchronized Secure Channel Negotiations. | `docs/handoff/REPORT_OUTLINE.md` | **NOT VERIFIED** | NONE of the stated limitations are empirically verified from full primary texts (only Paper B2 abstract was inspected). Team members must read the physical or PDF copies of all 3 papers to extract actual author-stated limitations. |
| **C11** | `README.md`, `TEAM_HANDOFF.md` | Cryptographic Idempotency: SHA-256 payload digest + unique constraint rejects duplicates with HTTP 200 and mutations with HTTP 422. | `PaymentControllerIntegrationTest.java` (`idempotentReplayReturns200`, `modifiedPayloadReturns422`), `scripts/verify_acceptance.js` | **VERIFIED** | Proven via automated integration tests and verified in `public.idempotency_keys` table. |
| **C12** | `FACTS_SHEET.md`, `TEAM_HANDOFF.md` | Exponential Backoff with Full Jitter Formula: Disperses retry storms across scheduled workers. | `PaymentRetryEngineTest.java`, `PaymentRetryWorker.java` | **VERIFIED** | Verified with test runs checking delay calculations and schedule progression. |
| **C13** | `FACTS_SHEET.md`, `TEAM_HANDOFF.md` | Two-Phase Bank Reconciliation: Resolves `UNKNOWN` transactions by querying `GET /bank/status/{ref}` after grace period. | `PaymentReconciliationTest.java`, `PaymentRecoveryWorkerTest.java` | **VERIFIED** | 8 tests passing in `PaymentReconciliationTest` verifying both charged (-> SUCCESS) and uncharged (-> RETRYING) transitions. |
| **C14** | `FACTS_SHEET.md`, `TEAM_HANDOFF.md` | Autonomous Stale `PROCESSING` Recovery: Sweeps stuck payments older than 60s into `UNKNOWN`. | `PaymentRecoveryWorkerTest.java`, `StaleProcessingWorker.java` | **VERIFIED** | 4 passing tests in `PaymentRecoveryWorkerTest` verifying transitions and audit log creation. |
| **C15** | `FACTS_SHEET.md`, `TEAM_HANDOFF.md` | Brute-force Login Rate Limiter: Blocks IP after 5 failed attempts within 15-minute rolling window (`HTTP 429`). | `AdminAuthIntegrationTest.java` (`loginRateLimiterBlocksAfter5Failures`) | **VERIFIED** | Verified via Spring MockMvc integration test. |
| **C16** | `FACTS_SHEET.md`, `TEAM_HANDOFF.md` | Reverse-proxy client IP isolation using `X-Forwarded-For` and `X-Real-IP`. | `AdminAuthIntegrationTest.java` (`proxyXForwardedForIsolatesRateLimiting`) | **VERIFIED** | Verified that attacker IP lockout does not block legitimate admin requests arriving from same proxy. |
| **C17** | `FACTS_SHEET.md`, `KNOWN_LIMITATIONS.md` | Client-forgeability of `X-Forwarded-For`: Rate limiting trusting first header entry is not spoof-proof without upstream edge filtering. | Code inspection of `AdminAuthController.java:extractClientIp` | **VERIFIED** | Explicitly documented as a known design trade-off in `docs/KNOWN_LIMITATIONS.md`. |
| **C18** | `FACTS_SHEET.md`, `README.md` | Zero Credential Custody: Zero PAN, CVV, or cardholder data stored in PostgreSQL schemas. | Schema inspection of `V1__init_payment_tables.sql` and `V1__init_bank_tables.sql` | **VERIFIED** | Database stores pre-tokenized strings (`pm_card_demo`) and reference UUIDs only. |
| **C19** | `DEPLOYMENT.md`, `render.yaml` | Production startup safety: Application context fails immediately outside local profile if admin credentials are unset. | `AdminStartupSafetyTest.java` (6 tests passing) | **VERIFIED** | Verified that `AdminAuthConfig.validateOnStartup()` throws `IllegalStateException` outside `local` profile. |
| **C20** | `docs/handoff/diagrams/` | Rendering Mermaid diagrams to PNG/SVG via local `mermaid-cli` execution. | CLI command `npx -p @mermaid-js/mermaid-cli mmdc` (failed with Puppeteer network error) | **NOT VERIFIED** | **BLOCKED**. Local headless Chromium in this environment cannot fetch internal assets. Raw `.mmd` files are verified and render cleanly on [Mermaid Live Editor](https://mermaid.live). |

---

## 3. Required Manual Actions for Unverified Claims

1. **Cloud Hosting (C07)**: Follow [docs/DEPLOYMENT.md](../DEPLOYMENT.md) as the single source of truth to configure environment variables (`ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_TOKEN`, `AUTH_TOKEN_SECRET`, `MOCK_BANK_URL`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `PORT` — note that `DB_URL` is not used) and link GitHub repo `nehaa-0420/Reliablepay` to personal Render and Vercel accounts.
2. **Interactive UI Verification (C08, C09)**: Perform manual click-through validation in Google Chrome:
   - For `/app`: Open `/app` -> Settings, toggle "Simulate Lost Response", submit an order, and verify progress screen finishes as "Paid" and `/admin/payments` shows exactly ONE new payment.
   - For `/admin`: Log in via `/admin/login` and verify Chaos Lab Apply, Run Experiment, and Requeue operate cleanly without 401 Unauthorized errors.
3. **Academic Literature Gaps (C10)**: Consult physical or PDF copies of the three base papers:
   - (1) *E-Financial Sentinel: Navigating India's Digital Transaction Landscape*
   - (2) *Statistical and Data Analytics Approaches to Parameter Tuning for QoS of E-Banking Transactions*
   - (3) *Failure Propagation in SAP MultiBank Payment Batches Due to Unsynchronized Secure Channel Negotiations*  
   None of the stated limitations are verified in this repository. Team members must read the full papers to extract verbatim author limitations and page numbers for the thesis chapter.
4. **Mermaid Image Export (C20)**: Paste `.mmd` contents from `docs/handoff/diagrams/` into [https://mermaid.live](https://mermaid.live) and save high-resolution SVG/PNG files directly into `docs/handoff/diagrams/`.

