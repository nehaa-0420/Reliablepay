# Phase 4 — Frontend (DRAFT)

Work ONLY on Phase 4. Use docs/API_SPEC.md. API base from VITE_API_BASE_URL.
Design: clean, modern fintech look; consistent colour tokens; responsive; no placeholder lorem ipsum.
1. Landing page with a strong hero section (headline about payments that survive failure, subtext, two buttons:
   "Open dashboard" and "Run the chaos lab"), a problem section, a "how it works" 4-step flow, a features grid,
   a Naive-vs-Protected teaser, and a footer with project/team info.
2. Dashboard: live payments table (status badges, polling 2s), create-payment form (with Idempotency-Key field and
   a "send twice" button), timeline drawer from /events.
3. Chaos Lab: sliders for the failure rates and latency, run-experiment button, results panel.
4. Compare page: bar charts + table for naive vs protected (Recharts).
5. Loading, empty and error states everywhere. Navigation bar. Router fallback.

Acceptance: `npm run build` passes; describe each page; give screenshots if you can.
