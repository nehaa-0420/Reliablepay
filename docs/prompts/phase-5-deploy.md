# Phase 5 — Deploy to Render and Vercel (DRAFT)

Work ONLY on Phase 5. Verify every step against the CURRENT Render and Vercel documentation and free-tier limits;
report anything that differs from render.yaml.
1. Review and correct render.yaml (Docker web services for payment-service and mock-bank, managed Postgres).
2. Set env vars: DB_*, MOCK_BANK_URL (public URL of the mock bank), CORS_ALLOWED_ORIGINS (Vercel URL), REDIS_ENABLED=false.
3. Deploy backend on Render. Show health check output from the public URLs.
4. Deploy frontend on Vercel with VITE_API_BASE_URL pointing to the Render payment-service URL.
5. Smoke test end to end from the public frontend: create payment, duplicate, chaos, experiment.
6. Add a keep-warm / wake-up note and script (curl both health URLs) for demo day.
Tell me exactly which steps need my manual action (accounts, dashboard clicks, secrets).
