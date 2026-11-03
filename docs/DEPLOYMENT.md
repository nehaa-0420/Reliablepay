# ReliablePay — Deployment Guide (Render & Vercel) — Review 3

This document provides complete instructions for deploying ReliablePay to cloud hosting on **Render** (backend microservices & managed PostgreSQL) and **Vercel** (React/Vite Customer Mobile PWA & Admin Console), along with free-tier constraints, environment variable references, click-by-click setup procedures, demo wake-up routines, and database recreation instructions for **Review 3** (November 2026).

---

## 1. System Architecture & Placement

```
                  ┌──────────────────────────────────────────────┐
                  │         Vercel (React 18 + Vite)             │
                  │        https://<your-vercel-url>             │
                  │   Routes: / (Landing), /app (PWA), /admin    │
                  └───────────────────────┬──────────────────────┘
                                          │ HTTPS (CORS)
                                          ▼
                  ┌──────────────────────────────────────────────┐
                  │       Render: reliablepay-payment-service    │
                  │       https://<your-payment-url>             │
                  │  Spring Boot 3.3 (JVM: -Xmx256m SerialGC)    │
                  └───────────────┬──────────────────────────────┘
                                  │
         ┌────────────────────────┴────────────────────────┐
         │ HTTPS (Public HTTPS URL via MOCK_BANK_URL)      │ JDBC / TLS
         ▼                                                 ▼
┌─────────────────────────────────────┐   ┌────────────────────────────────────┐
│      Render: reliablepay-mock-bank  │   │     Render: reliablepay-db         │
│       https://<your-bank-url>       │   │   Managed PostgreSQL 16 (Free)     │
│ Spring Boot 3.3 (JVM: -Xmx256m)     │   │   Schemas: `public` & `bank`       │
└──────────────────┬──────────────────┘   │   Flyway V1 migrations auto-run    │
                   │ JDBC / TLS           └─────────────────▲──────────────────┘
                   └────────────────────────────────────────┘
```

- **Frontend (Vercel)**: `https://<your-vercel-url>`
- **Payment Service (Render)**: `https://<your-payment-service-url>`
- **Mock Bank (Render)**: `https://<your-mock-bank-url>`
- **PostgreSQL Database (Render)**: `reliablepay-db` (Postgres 16, hosted on Render)

---

## 2. Render Free-Tier Limits & Container Tuning

| Constraint | Limit | System Mitigation & Configuration |
| :--- | :---: | :--- |
| **RAM** | 512 MB per service | Configured `JAVA_TOOL_OPTIONS="-Xmx256m -XX:+UseSerialGC -XX:MaxMetaspaceSize=96m"` in `render.yaml` and Dockerfiles. Keeps total container RSS < 400 MB. |
| **CPU** | 0.1 vCPU (shared) | `-XX:+UseSerialGC` minimizes thread count and memory allocator overhead on single-core instances. |
| **Idle Sleep** | Sleeps after 15 min idle | Free-tier web services spin down after 15 minutes of inactivity; initial cold-start takes ~50–80s. Mitigated with `GET /api/system/wake`, UI `ColdStartBanner`, and `scripts/wake.ps1`. |
| **Networking** | No free private network | On Render's free plan, inter-service private networking is not included. `payment-service` connects to `mock-bank` over its public HTTPS URL via `MOCK_BANK_URL` (no `:8081`, no `http://mock-bank`). |
| **PostgreSQL** | Expires after 30 days | Free-tier databases expire after 30 days. When re-provisioning a new database, Flyway schema migrations run automatically on container startup. |

> [!IMPORTANT]
> **Render Free-Tier Terms & Constraints**:
> - **750 Free Instance Hours**: Render allocates a shared pool of 750 free instance hours per calendar month across all free web services in your workspace (verified against current Render documentation).
> - **Inactivity Sleep**: Free web services automatically spin down (sleep) after 15 minutes of inactivity. The next request triggers container startup with a cold-start delay of ~50–80 seconds (mitigated by `GET /api/system/wake`, UI banner, and `scripts/wake.ps1`).
> - **PostgreSQL Expiration & Limits**: Free PostgreSQL instances are strictly capped at 1 GB storage and expire 30 days after creation (with a 14-day grace period to upgrade before permanent data deletion; verified against current Render documentation). You must check the current terms before your demo, and re-provision if the 30-day window has expired.
> - *Unverified / Subject to change*: Future pricing model adjustments, regional latency variations, or unannounced terms adjustments cannot be verified in advance and must be verified on Render's pricing page prior to live reviews.

> [!NOTE]
> **SSE on Render**: Free-tier web services on Render route through reverse proxies. If proxy buffering or HTTP chunking delays Server-Sent Events, the frontend applications (`/app/progress/:id` and `/admin`) automatically fall back to periodic polling (`GET /api/payments/{id}` every 2 seconds) so the user interface never freezes.

---

## 3. Environment Variables Reference

### Secret Hygiene Rules
> [!CAUTION]
> **Never put secrets in VITE_ variables; they are public.**
> Any environment variable prefixed with `VITE_` is automatically compiled and bundled directly into client-side JavaScript during `npm run build`. Administrative passwords, private tokens, or signing keys must **NEVER** use the `VITE_` prefix or be referenced in frontend code.

### Shared Variable Invariant
> [!IMPORTANT]
> **Matching Secret Invariant**: `HttpBankClient` in `payment-service` attaches the `X-Admin-Token` header on all administrative requests to `mock-bank` (`/bank/admin/stats`, `/bank/admin/chaos`, `/bank/admin/reset`). `mock-bank` validates incoming tokens in `BankAdminTokenInterceptor`. Therefore, **`ADMIN_TOKEN` MUST have the EXACT SAME value in both `reliablepay-payment-service` and `reliablepay-mock-bank`**. If they differ, payment-service will receive 401 when updating chaos or querying bank stats.

### Complete Variable Table

| Service | Variable Name | Purpose | Required | Placeholder / Example |
| :--- | :--- | :--- | :---: | :--- |
| **payment-service** | `DATABASE_URL` | PostgreSQL connection string from Render managed DB | Yes | Injected from `reliablepay-db` |
| **payment-service** | `MOCK_BANK_URL` | Public HTTPS URL of the deployed mock-bank (no `:8081`, no `http://`) | Yes | `https://<your-mock-bank-url>.onrender.com` |
| **payment-service** | `CORS_ALLOWED_ORIGINS` | Comma-separated list of allowed frontend origins (no trailing slash) | Yes | `https://<your-vercel-production-url>.vercel.app,http://localhost:5173` |
| **payment-service** | `ADMIN_USERNAME` | Username for administrator login (`POST /api/auth/admin/login`) | Yes | `<your-admin-username>` (e.g. `admin`) |
| **payment-service** | `ADMIN_PASSWORD` | Password for administrator login (`POST /api/auth/admin/login`) | Yes | `<your-strong-password>` (never commit or use default) |
| **payment-service** | `AUTH_TOKEN_SECRET` | HMAC-SHA256 signing secret for JWT tokens (min 32 bytes) | Yes | `<64-char-hex-secret>` (generated via PowerShell snippet) |
| **payment-service** | `ADMIN_TOKEN` | Shared secret token for mock-bank admin endpoints and script automation | Yes | `<your-shared-admin-token>` (must match mock-bank) |
| **payment-service** | `ADMIN_RESET_ENABLED` | Enables `POST /api/admin/reset` endpoint | No | `true` |
| **payment-service** | `REDIS_ENABLED` | Enables optional Redis cache layer (disabled on free tier) | No | `false` |
| **payment-service** | `SPRING_PROFILES_ACTIVE`| Activates production profile with startup safety checks | Yes | `production` |
| **payment-service** | `JAVA_TOOL_OPTIONS` | Memory constraints for 512MB RAM instance | Yes | `-Xmx256m -XX:+UseSerialGC -XX:MaxMetaspaceSize=96m` |
| **mock-bank** | `DATABASE_URL` | PostgreSQL connection string from Render managed DB | Yes | Injected from `reliablepay-db` |
| **mock-bank** | `ADMIN_TOKEN` | Secret token guarding `/bank/admin/**` endpoints | Yes | `<your-shared-admin-token>` (must match payment-service) |
| **mock-bank** | `JAVA_TOOL_OPTIONS` | Memory constraints for 512MB RAM instance | Yes | `-Xmx256m -XX:+UseSerialGC -XX:MaxMetaspaceSize=96m` |
| **frontend (Vercel)** | `VITE_API_BASE_URL` | Public HTTPS URL of payment-service (no trailing slash) | Yes | `https://<your-payment-service-url>.onrender.com` |
| **frontend (Vercel)** | `VITE_PUBLIC_APP_URL`| Public URL of customer mobile app (encoded in Landing QR code) | Optional | `https://<your-vercel-production-url>.vercel.app/app` |

---

## 4. Deployment Procedure & Order

Follow this exact sequence to deploy cleanly:

```
Step 1: Render Blueprint ──► Step 2: Vercel Frontend ──► Step 3: Cross-Link URLs ──► Step 4: Redeploy & Verify
```

### Step 1: Deploy Backend Microservices & Database on Render
1. Keep your repository **Private** for security.
2. In [Render Dashboard](https://dashboard.render.com), go to **Account Settings** -> **GitHub** and grant Render access to your repository `Reliablepay` via the official Render GitHub App.
3. Click **New +** -> select **Blueprint**.
4. Connect repository `Reliablepay` (branch `main`).
5. Render reads `render.yaml` and prepares 3 resources: `reliablepay-db`, `reliablepay-mock-bank`, and `reliablepay-payment-service`.
6. Enter the required non-synced (`sync: false`) variables:
   - `ADMIN_USERNAME`: your admin username.
   - `ADMIN_PASSWORD`: your confidential admin password.
   - `AUTH_TOKEN_SECRET`: generate a secure 256-bit hex secret on your local machine using PowerShell:
     ```powershell
     $bytes = [byte[]]::new(32); [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes); [System.BitConverter]::ToString($bytes).Replace('-', '').ToLower()
     ```
     *(This outputs a 64-character random hex string directly on screen without persisting it to disk).*
   - `ADMIN_TOKEN`: generate a random secret string and enter the SAME value for both `payment-service` and `mock-bank`.
   - `MOCK_BANK_URL`: enter a harmless placeholder such as `https://example.com` when Render asks (Render requires a non-empty string on blueprint initialization; you will replace this in Step 1.8 once `mock-bank` is assigned its real hostname).
   - `CORS_ALLOWED_ORIGINS`: enter a harmless placeholder such as `https://example.com` (you will replace this in Step 3 with your actual Vercel production domain).
7. Click **Apply**. Wait for Render to provision the database and build both containers. Note down the public HTTPS URLs assigned by Render for `reliablepay-payment-service` and `reliablepay-mock-bank`.
8. Once `mock-bank` is assigned its URL, update `MOCK_BANK_URL` in `reliablepay-payment-service` environment settings with `https://<your-mock-bank-url>.onrender.com`.

### Step 2: Deploy Frontend on Vercel
1. Log into [Vercel](https://vercel.com/dashboard).
2. Authorize the Vercel GitHub App to access your private `Reliablepay` repository.
3. Click **Add New...** -> **Project**, then **Import** the repository.
4. In Project Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: click **Edit** and choose `frontend`.
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. In **Environment Variables**, add:
   - `VITE_API_BASE_URL` = `https://<your-payment-service-url>.onrender.com`
6. Click **Deploy**. Note down your assigned Vercel **PRODUCTION** domain (e.g. `https://<your-project>.vercel.app`).
   - *Where to find it*: In Vercel Project Dashboard -> **Settings** -> **Domains**. Use the domain marked with the **Production** badge.

### Step 3: Cross-Link URLs (CORS & Landing QR Code)
> [!IMPORTANT]
> **Use Only the Vercel Production Domain**: `CORS_ALLOWED_ORIGINS` and `VITE_PUBLIC_APP_URL` must use only your Vercel **PRODUCTION** domain (e.g. `https://<your-project>.vercel.app`), NOT per-deployment preview URLs (e.g. `https://<your-project>-git-main-<username>.vercel.app` or `https://<your-project>-<hash>.vercel.app`). Preview URLs change on every push and will cause CORS rejections or invalid QR code destinations.

Now that both public hostnames exist:
1. In **Render** -> `reliablepay-payment-service` -> **Environment**:
   - Update `CORS_ALLOWED_ORIGINS` to `https://<your-vercel-production-url>.vercel.app,http://localhost:5173`.
2. In **Vercel** -> Settings -> **Environment Variables**:
   - Add or update `VITE_PUBLIC_APP_URL` = `https://<your-vercel-production-url>.vercel.app/app`.

### Step 4: Redeploy Both Services
1. In Render, trigger a manual deploy on `reliablepay-payment-service` ("Clear build cache & deploy" or "Deploy latest commit").
2. In Vercel, click **Redeploy** on the latest deployment so `VITE_PUBLIC_APP_URL` is baked into the client bundle and the Landing Page QR code.

---

## 5. Pre-Demo Wake-Up Routine (`scripts/wake.ps1`)

Render free-tier instances spin down after 15 minutes of inactivity. Always wake up the backend before demonstration:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/wake.ps1 -PaymentServiceUrl "https://<your-payment-service-url>.onrender.com" -MockBankUrl "https://<your-mock-bank-url>.onrender.com"
```
Or set environment variables in your shell:
```powershell
$env:PAYMENT_SERVICE_URL = "https://<your-payment-service-url>.onrender.com"
$env:MOCK_BANK_URL       = "https://<your-mock-bank-url>.onrender.com"
powershell -ExecutionPolicy Bypass -File scripts/wake.ps1
```

The script polls `/actuator/health` on both services until both report `UP`. Cold start duration is typically **50 – 80 seconds**. Once warm, all API requests respond within **15 – 35 ms**.

### Post-Deployment Verification Scripts

1. **Acceptance Test Suite**:
   ```bash
   node scripts/verify_acceptance.js
   ```
2. **Live SSE Event Streams Verification**:
   ```bash
   ADMIN_USERNAME=<your-admin-username> ADMIN_PASSWORD=<your-admin-password> node scripts/verify_live_streams.js
   ```
   Or in PowerShell:
   ```powershell
   $env:ADMIN_USERNAME = "<your-admin-username>"
   $env:ADMIN_PASSWORD = "<your-admin-password>"
   node scripts/verify_live_streams.js
   ```

---

## 6. Historical Track Record
- **Review 1**: Core 7-state payment engine, PostgreSQL ACID idempotency locks, background retry and status enquiry reconciliation workers.
- **Review 2**: High-fidelity fintech UI redesign, accessible WCAG 2.1 AA design system tokens, side-by-side empirical benchmark runner proving 0 duplicate debits under 30% timeout chaos.
- **Review 3 (Current)**: Customer Mobile PWA (`/app`) with offline support and client retry demo; Admin Console (`/admin`) with JWT authentication and real-time SSE Live Pipeline Monitor; Stale `PROCESSING` automatic recovery worker; production deployment manifests on Render & Vercel.
