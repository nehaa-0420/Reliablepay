# ReliablePay — Deployment Guide (Render & Vercel) — Review 3

This document provides complete instructions for deploying ReliablePay to cloud hosting on **Render** (backend microservices & managed PostgreSQL) and **Vercel** (React/Vite Customer Mobile PWA & Admin Console), along with free-tier constraints, environment variable references, click-by-click setup procedures, demo wake-up routines, and database recreation instructions for **Review 3** (November 2026).

---

## 1. System Architecture & URLs

```
                  ┌──────────────────────────────────────────────┐
                  │         Vercel (React 18 + Vite)             │
                  │   https://reliablepay-demo.vercel.app        │
                  │   Routes: / (Landing), /app (PWA), /admin    │
                  └───────────────────────┬──────────────────────┘
                                          │ HTTPS (CORS)
                                          ▼
                  ┌──────────────────────────────────────────────┐
                  │       Render: reliablepay-payment-service    │
                  │  https://reliablepay-payment-service.onrender │
                  │  Spring Boot 3.3 (JVM: -Xmx256m SerialGC)    │
                  └───────────────┬──────────────────────────────┘
                                  │
         ┌────────────────────────┴────────────────────────┐
         │ HTTPS (Public URL)                              │ JDBC / TLS
         ▼                                                 ▼
┌─────────────────────────────────────┐   ┌────────────────────────────────────┐
│      Render: reliablepay-mock-bank  │   │     Render: reliablepay-db         │
│ https://reliablepay-mock-bank...    │   │   Managed PostgreSQL 16 (Free)     │
│ Spring Boot 3.3 (JVM: -Xmx256m)     │   │   Schemas: `public` & `bank`       │
└──────────────────┬──────────────────┘   │   Flyway V1 migrations auto-run    │
                   │ JDBC / TLS           └─────────────────▲──────────────────┘
                   └────────────────────────────────────────┘
```

- **Frontend (Vercel)**: `https://<your-vercel-app>.vercel.app`
- **Payment Service (Render)**: `https://reliablepay-payment-service.onrender.com`
- **Mock Bank (Render)**: `https://reliablepay-mock-bank.onrender.com`
- **PostgreSQL Database (Render)**: `reliablepay-db` (Postgres 16, hosted on Render)

---

## 2. Render Free-Tier Limits & Container Tuning

| Constraint | Limit | System Mitigation & Configuration |
| :--- | :---: | :--- |
| **RAM** | 512 MB per service | Configured `JAVA_TOOL_OPTIONS="-Xmx256m -XX:+UseSerialGC -XX:MaxMetaspaceSize=96m"` in `render.yaml` and Dockerfiles. Keeps total container RSS < 400 MB. |
| **CPU** | 0.1 vCPU (shared) | `-XX:+UseSerialGC` minimizes thread count and memory allocator overhead on single-core instances. |
| **Idle Sleep** | Sleeps after 15 min idle | Initial request takes ~50–80s to cold-start. Mitigated with `GET /api/system/wake`, UI `ColdStartBanner`, and `scripts/wake.ps1`. |
| **Networking** | No free private network | `payment-service` communicates with `mock-bank` over its public HTTPS URL via `BANK_BASE_URL` / `MOCK_BANK_URL`. |
| **PostgreSQL** | Expires after 30 days | Self-healing schema: Flyway migrations run automatically on container startup when connected to a fresh database. |

---

## 3. Environment Variables Reference

### A. `reliablepay-payment-service` (Render)

> [!IMPORTANT]
> **Startup Safety**: In production mode (`SPRING_PROFILES_ACTIVE: production`), `payment-service` **refuses to start** (`IllegalStateException`) if `ADMIN_USERNAME`, `ADMIN_PASSWORD`, or `AUTH_TOKEN_SECRET` are unset.

| Variable | Required | Description | Example / Note |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | Yes | PostgreSQL connection string from Render database | `postgres://user:pass@dpg-xxx.render.com:5432/reliablepay` (auto-converted to JDBC by `docker-entrypoint.sh`) |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Optional | Individual database connection parameters (used if `DATABASE_URL` is omitted) | Auto-injected from `reliablepay-db` |
| `BANK_BASE_URL` | Yes | Public HTTPS URL of the deployed `reliablepay-mock-bank` | `https://reliablepay-mock-bank.onrender.com` |
| `MOCK_BANK_URL` | Yes | Alias for `BANK_BASE_URL` | `https://reliablepay-mock-bank.onrender.com` |
| `CORS_ALLOWED_ORIGINS` | Yes | Comma-separated list of allowed frontend origins (no trailing slashes) | `https://reliablepay-demo.vercel.app,http://localhost:5173` |
| `ADMIN_USERNAME` | Yes | Admin username for `POST /api/auth/admin/login` | Set by you in Render Dashboard |
| `ADMIN_PASSWORD` | Yes | Admin password for `POST /api/auth/admin/login` | Set by you in Render Dashboard |
| `AUTH_TOKEN_SECRET` | Yes | HMAC-SHA256 signing secret (at least 32 characters) | Set by you in Render Dashboard (e.g. 64-char hex string) |
| `ADMIN_TOKEN` | Optional | Shared token for script automation and legacy `X-Admin-Token` header support | Set by you in Render Dashboard |
| `ADMIN_RESET_ENABLED` | No | Allows POST `/api/admin/reset` | `true` |
| `REDIS_ENABLED` | No | Enables optional Redis cache layer (disabled on free tier) | `false` |
| `SPRING_PROFILES_ACTIVE` | Yes | Activates production security profile | `production` |
| `JAVA_TOOL_OPTIONS` | Yes | JVM memory constraints for 512MB RAM instance | `-Xmx256m -XX:+UseSerialGC -XX:MaxMetaspaceSize=96m` |

### B. `reliablepay-mock-bank` (Render)

| Variable | Required | Description | Example / Note |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | Yes | PostgreSQL connection string from Render database | `postgres://user:pass@dpg-xxx.render.com:5432/reliablepay` |
| `ADMIN_TOKEN` | Yes | Secret token guarding `/bank/admin/**` endpoints | Must match `ADMIN_TOKEN` in `payment-service` |
| `JAVA_TOOL_OPTIONS` | Yes | JVM memory constraints for 512MB RAM instance | `-Xmx256m -XX:+UseSerialGC -XX:MaxMetaspaceSize=96m` |

### C. `reliablepay-frontend` (Vercel)

| Variable | Required | Description | Example |
| :--- | :---: | :--- | :--- |
| `VITE_API_BASE_URL` | Yes | Public HTTPS URL of the payment-service (no trailing slash) | `https://reliablepay-payment-service.onrender.com` |
| `VITE_ADMIN_TOKEN` | Optional | Admin token passed in `X-Admin-Token` header | Must match backend `ADMIN_TOKEN` |
| `VITE_PUBLIC_APP_URL` | Optional | Public URL of mobile app encoded in landing page QR code | `https://reliablepay-demo.vercel.app/app` |

---

## 4. Click-by-Click Deployment Instructions

### Part 1: GitHub Repository Visibility & Connection
1. Open your browser and navigate to `https://github.com/nehaa-0420/Reliablepay`.
2. Ensure the repository is **Public** (or that Render and Vercel GitHub Apps have access if Private):
   - Go to **Settings** -> Scroll down to **Danger Zone** -> Verify **Change repository visibility**.
3. All code for Review 3 is committed and tagged on branch `main`.

### Part 2: Render Backend & Database Deployment via Blueprint
1. Open [dashboard.render.com](https://dashboard.render.com/) and log into your Render account.
2. In the top navigation, click **New +** and select **Blueprint**.
3. Under **Connect a repository**, choose `nehaa-0420/Reliablepay` (or click **Configure access** if permissions need to be granted).
4. Render will inspect `render.yaml` and show:
   - **Database**: `reliablepay-db` (PostgreSQL 16, Plan: Free)
   - **Service 1**: `reliablepay-mock-bank` (Docker Web Service, Plan: Free)
   - **Service 2**: `reliablepay-payment-service` (Docker Web Service, Plan: Free)
5. Under **Environment Variables**, Render will prompt you to enter the `sync: false` variables:
   - `ADMIN_USERNAME`: Enter your chosen admin username.
   - `ADMIN_PASSWORD`: Enter your chosen secure admin password.
   - `AUTH_TOKEN_SECRET`: Enter a 64-character random hexadecimal HMAC key (e.g. generated via `openssl rand -hex 32`).
   - `ADMIN_TOKEN`: Enter a private automation secret token.
   - `BANK_BASE_URL` & `MOCK_BANK_URL`: `https://reliablepay-mock-bank.onrender.com`.
   - `CORS_ALLOWED_ORIGINS`: Enter `https://reliablepay-demo.vercel.app,http://localhost:5173` (update with your final Vercel URL once assigned).
6. Click **Apply**.
7. Render will provision the PostgreSQL database first, then build and deploy the Docker containers.

### Part 3: Vercel Frontend Deployment
1. Open [vercel.com](https://vercel.com/) and log into your account.
2. Click **Add New...** -> **Project**.
3. Select your GitHub repository (`Reliablepay`) and click **Import**.
4. In the Project Configuration dialog:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click **Edit** and select `frontend` (crucial: Vite app lives in `frontend/`).
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Expand **Environment Variables**:
   - `VITE_API_BASE_URL` = `https://reliablepay-payment-service.onrender.com` (no trailing slash).
   - `VITE_PUBLIC_APP_URL` = `https://<your-project>.vercel.app/app`
6. Click **Deploy**.
7. Vercel will install dependencies, compile the PWA bundle, generate the service worker, and deploy to their edge CDN in ~45 seconds.
8. Single Page App rewrites (`vercel.json`) ensure that direct visits or refreshes to `/app`, `/app/pay`, `/app/progress/:id`, `/admin`, `/admin/login`, etc., return `200 OK` rather than 404.

---

## 5. Pre-Demo Wake-Up Routine (`scripts/wake.ps1`)

Render free-tier instances sleep after 15 minutes of inactivity. Always wake the services before demonstration:

1. **10 minutes before the review**, execute:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts/wake.ps1
   ```
2. The script dispatches cold-start triggers and polls `/actuator/health` every 3 seconds until both report `UP`.
3. Expected cold-boot duration: **55 – 82 seconds**. Once hot, all subsequent API responses return within **15 – 35 ms**.

---

## 6. Honest History & Prior Review Track Record
- **Review 1**: Core 7-state payment engine, PostgreSQL ACID idempotency locks, background retry and status enquiry reconciliation workers.
- **Review 2**: High-fidelity fintech UI redesign, accessible WCAG 2.1 AA design system tokens, side-by-side empirical benchmark runner proving 0 duplicate debits under 30% timeout chaos.
- **Review 3 (Current)**: Customer Mobile PWA (`/app`) with offline support and client retry demo; Admin Console (`/admin`) with JWT authentication and real-time SSE Live Pipeline Monitor; Stale `PROCESSING` automatic recovery worker; production deployment manifests on Render & Vercel.
