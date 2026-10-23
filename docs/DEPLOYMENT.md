# ReliablePay — Deployment Guide (Render & Vercel)

This document provides complete instructions for deploying ReliablePay to cloud hosting on **Render** (backend microservices & managed PostgreSQL) and **Vercel** (React/Vite SPA frontend), along with free-tier constraints, environment variable references, demo wake-up checklists, and database recreation instructions.

---

## 1. System Architecture & URLs

```
                  ┌──────────────────────────────────────────────┐
                  │         Vercel (React 18 + Vite)             │
                  │   https://reliablepay-frontend.vercel.app    │
                  └───────────────────────┬──────────────────────┘
                                          │ HTTPS (CORS)
                                          ▼
                  ┌──────────────────────────────────────────────┐
                  │       Render: reliablepay-payment-service    │
                  │  https://reliablepay-payment-service.onrender │
                  └───────────────┬──────────────────────────────┘
                                  │
         ┌────────────────────────┴────────────────────────┐
         │ HTTPS (Public URL)                              │ JDBC / TLS
         ▼                                                 ▼
┌─────────────────────────────────────┐   ┌────────────────────────────────────┐
│      Render: reliablepay-mock-bank  │   │     Render: reliablepay-db         │
│ https://reliablepay-mock-bank...    │   │   Managed PostgreSQL 16 (Free)     │
└──────────────────┬──────────────────┘   │   Schemas: `public` & `bank`       │
                   │ JDBC / TLS           └─────────────────▲──────────────────┘
                   └────────────────────────────────────────┘
```

- **Frontend (Vercel)**: `https://<your-vercel-app>.vercel.app`
- **Payment Service (Render)**: `https://reliablepay-payment-service.onrender.com`
- **Mock Bank (Render)**: `https://reliablepay-mock-bank.onrender.com`
- **PostgreSQL Database (Render)**: `reliablepay-db` (Postgres 16, hosted on Render)

---

## 2. Render Free-Tier Limits & Container Tuning

| Constraint | Limit | System Mitigation |
| :--- | :--- | :--- |
| **RAM** | 512 MB per service | Configured `JAVA_TOOL_OPTIONS="-Xmx300m -XX:+UseSerialGC -XX:MaxMetaspaceSize=96m"` in both Dockerfiles. Keeps total container RSS < 420 MB. |
| **CPU** | 0.1 vCPU (shared) | Serial GC reduces thread and CPU overhead on low-core instances. |
| **Idle Sleep** | Sleeps after 15 min idle | Initial request takes ~50–70s to cold-start. Mitigated with `GET /api/system/wake` and UI `ColdStartBanner`. |
| **Networking** | No free private network | `payment-service` communicates with `mock-bank` over its public HTTPS URL via `BANK_BASE_URL`. |
| **PostgreSQL** | Expires after 30 days | Self-healing schema: Flyway migrations run automatically on container startup when connected to a fresh database. |

---

## 3. Environment Variables Reference

### A. `reliablepay-payment-service` (Render)

| Variable | Required | Description | Example / Default |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | Yes | PostgreSQL connection string from Render database | `postgres://user:pass@dpg-xxx.render.com:5432/reliablepay` (auto-converted to JDBC by `docker-entrypoint.sh`) |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Optional | Individual database connection parameters (used if `DATABASE_URL` is omitted) | `dpg-xxx.render.com`, `5432`, `reliablepay`, `reliablepay`, `secret` |
| `BANK_BASE_URL` | Yes | Public HTTPS URL of the deployed `reliablepay-mock-bank` | `https://reliablepay-mock-bank.onrender.com` |
| `CORS_ALLOWED_ORIGINS` | Yes | Comma-separated list of allowed origins | `https://reliablepay-frontend.vercel.app,http://localhost:5173` |
| `ADMIN_TOKEN` | Yes | Secret token guarding `/api/admin/reset`, `/api/chaos` (PUT), `/api/experiments/run` (POST) | e.g. `citi-demo-secret-token-2026` |
| `ADMIN_RESET_ENABLED` | No | Allows POST `/api/admin/reset` | `true` |
| `REDIS_ENABLED` | No | Enables optional Redis cache layer (disabled on free tier) | `false` |
| `BANK_READ_TIMEOUT_MS` | No | HTTP read timeout for bank transactions | `2000` |
| `BANK_CONNECT_TIMEOUT_MS` | No | HTTP connection timeout for bank client | `1000` |
| `EXPERIMENT_WAIT_TIMEOUT_MS` | No | Timeout for batch experiment terminal state polling | `90000` |
| `PORT` | Auto | Port provided by Render environment | Render assigns automatically (defaults to `8080`) |

### B. `reliablepay-mock-bank` (Render)

| Variable | Required | Description | Example / Default |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | Yes | PostgreSQL connection string from Render database | `postgres://user:pass@dpg-xxx.render.com:5432/reliablepay` |
| `ADMIN_TOKEN` | Yes | Secret token guarding `/bank/admin/**` endpoints | Must match `ADMIN_TOKEN` in `payment-service` |
| `PORT` | Auto | Port provided by Render environment | Render assigns automatically (defaults to `8081`) |

### C. `reliablepay-frontend` (Vercel)

| Variable | Required | Description | Example |
| :--- | :---: | :--- | :--- |
| `VITE_API_BASE_URL` | Yes | Public HTTPS URL of the payment-service | `https://reliablepay-payment-service.onrender.com` |
| `VITE_ADMIN_TOKEN` | Yes | Admin token passed in `X-Admin-Token` header for chaos/experiments/reset | Must match backend `ADMIN_TOKEN` |

---

## 4. How Render's Database URL is Converted to JDBC

Render provides a standard PostgreSQL URI:
`postgres://user:password@dpg-xxxx.render.com:5432/reliablepay`

Spring Boot and Flyway require JDBC format:
`jdbc:postgresql://dpg-xxxx.render.com:5432/reliablepay` with separate credentials.

Both microservices include [docker-entrypoint.sh](file:///c:/Users/Admin/Downloads/payment-reliability-system/payment-reliability-system/backend/payment-service/docker-entrypoint.sh) which runs before the JVM starts:
1. Detects `postgres://` or `postgresql://` in `$DATABASE_URL`.
2. Extracts credentials (`DB_USER`, `DB_PASSWORD`) and exports `SPRING_DATASOURCE_USERNAME` and `SPRING_DATASOURCE_PASSWORD`.
3. Strips credentials and protocol, prefixing `jdbc:postgresql://`, exporting `SPRING_DATASOURCE_URL`.
4. Executes `exec java -jar app.jar "$@"`.
5. `application.yml` uses `${SPRING_DATASOURCE_URL}` with fallbacks to `${JDBC_DATABASE_URL}` or individual `${DB_HOST}` / `${DB_PORT}` / `${DB_NAME}` variables.

---

## 5. Step-by-Step Deployment Instructions

### Step 1: Git Initialization & GitHub Push
Run in your local terminal:
```bash
git init
git add .
git commit -m "feat: complete Phase 0-5 ReliablePay with Render blueprint and Vercel config"
git branch -M main
git remote add origin https://github.com/<your-username>/payment-reliability-system.git
git push -u origin main
```

### Step 2: Deploy Backend & Database on Render via Blueprint
1. Log in to [dashboard.render.com](https://dashboard.render.com).
2. Click **New +** -> **Blueprint**.
3. Connect your GitHub repository `payment-reliability-system`.
4. Render automatically parses `render.yaml` and displays:
   - Database: `reliablepay-db` (Postgres, Free)
   - Web Service 1: `reliablepay-mock-bank` (Docker, Free)
   - Web Service 2: `reliablepay-payment-service` (Docker, Free)
5. Set the sync values prompted by Render:
   - `ADMIN_TOKEN`: Enter a secure random string (e.g. `citi-demo-secret-2026`).
   - `BANK_BASE_URL`: Initially enter `https://reliablepay-mock-bank.onrender.com` (Render assigns predictable URLs based on service name).
   - `CORS_ALLOWED_ORIGINS`: Enter your anticipated Vercel URL and localhost: `https://<your-project>.vercel.app,http://localhost:5173`.
6. Click **Apply**.
7. Once `reliablepay-mock-bank` finishes building, verify its health:
   ```bash
   curl -i https://reliablepay-mock-bank.onrender.com/actuator/health
   # Expected: {"status":"UP"}
   ```
8. Verify `reliablepay-payment-service` health:
   ```bash
   curl -i https://reliablepay-payment-service.onrender.com/actuator/health
   # Expected: {"status":"UP"}
   ```

### Step 3: Deploy Frontend on Vercel
1. Log in to [vercel.com](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Import your GitHub repository `payment-reliability-system`.
4. Configure Project Settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend` (Click edit and select `frontend`)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Under **Environment Variables**, add:
   - `VITE_API_BASE_URL` = `https://reliablepay-payment-service.onrender.com`
   - `VITE_ADMIN_TOKEN` = `<same token as ADMIN_TOKEN on Render>`
6. Click **Deploy**.
7. Note your public Vercel URL (e.g. `https://reliablepay-demo.vercel.app`).
8. If the Vercel URL differs from what was entered in Render's `CORS_ALLOWED_ORIGINS`:
   - Go to Render -> `reliablepay-payment-service` -> **Environment**.
   - Update `CORS_ALLOWED_ORIGINS` to include your exact Vercel URL.
   - Click **Save Changes** (Render restarts the service with zero downtime).

---

## 6. Pre-Demo Wake-Up Checklist

Because Render free-tier instances sleep after 15 minutes of inactivity, always perform this 5-minute pre-demo wake-up:

1. **5 minutes before the presentation**, open a browser or terminal and call the wake endpoint:
   ```bash
   curl -i https://reliablepay-payment-service.onrender.com/api/system/wake
   ```
   - This single call boots `reliablepay-payment-service` and immediately issues an HTTP request to `reliablepay-mock-bank/actuator/health`, waking both services simultaneously.
   - Response when fully awake:
     ```json
     {
       "paymentService": "UP",
       "mockBank": "UP"
     }
     ```
2. Open your Vercel URL in the browser: `https://<your-app>.vercel.app`.
3. Check the header status pill: It should show **Backend: UP** (green dot).
4. Verify the Chaos Lab (`/lab`): Click **Quick demo (60 orders)** to ensure the warm system executes within ~45 seconds.

---

## 7. Render Free Postgres 30-Day Expiry & Recreation Procedure

Render free PostgreSQL databases expire after 30 days. To recreate:
1. Log in to [dashboard.render.com](https://dashboard.render.com).
2. Go to **PostgreSQL** -> click your expired `reliablepay-db` -> delete it.
3. Click **New +** -> **PostgreSQL**:
   - **Name**: `reliablepay-db`
   - **Database**: `reliablepay`
   - **User**: `reliablepay`
   - **Plan**: Free
4. Once provisioned, copy the **Internal Database URL** (or external connection string).
5. In Render Dashboard:
   - In `reliablepay-mock-bank` -> **Environment**: update `DATABASE_URL`.
   - In `reliablepay-payment-service` -> **Environment**: update `DATABASE_URL`.
6. Restart both services:
   - Flyway automatically runs all migration scripts (`V1__...` and `V2__...`).
   - Both schemas (`public` for payments and `bank` for mock-bank charges) are automatically generated and ready. No manual SQL scripts required.

---

## 8. MANUAL STEPS STILL NEEDED

To transition from the local Docker Compose verification to live cloud hosting:

1. **GitHub Push**:
   ```bash
   git push -u origin main
   ```
2. **Render Account Blueprint Deploy**:
   - Log in to https://dashboard.render.com.
   - Click **New +** -> **Blueprint**.
   - Connect repository `https://github.com/nehaa-0420/Reliablepay.git`.
   - Fill in prompted sync variables (`ADMIN_TOKEN`, `BANK_BASE_URL`, `CORS_ALLOWED_ORIGINS`).
   - Click **Apply**.
3. **Vercel Account Frontend Import**:
   - Log in to https://vercel.com.
   - Click **Add New...** -> **Project**.
   - Select repository `Reliablepay`, set root directory to `frontend`.
   - Add environment variables:
     - `VITE_API_BASE_URL` = `https://reliablepay-payment-service.onrender.com`
     - `VITE_ADMIN_TOKEN` = `<same ADMIN_TOKEN as on Render>`
   - Click **Deploy**.
4. **CORS Alignment**:
   - Ensure Render's `CORS_ALLOWED_ORIGINS` includes your assigned Vercel domain (`https://<project-name>.vercel.app`).

