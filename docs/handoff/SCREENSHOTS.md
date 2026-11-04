# ReliablePay — User Interface Screenshots Catalog & Asset Audit

**Document Purpose**: Catalog and verification audit of all graphical user interface screenshots located in `docs/screenshots/`. Contains image resolutions, route mappings, demonstrated features, visual validity status, and a list of secondary screens to capture manually.  
**Companion Documents**:
- Presentation Deck Outline: [`docs/handoff/PPT_OUTLINE.md`](PPT_OUTLINE.md)
- Verified Facts Sheet: [`docs/handoff/FACTS_SHEET.md`](FACTS_SHEET.md)
- System Fallback Guide: [`docs/FALLBACK.md`](../FALLBACK.md)

---

## 1. Verified Screenshots Catalog

All 15 screenshots have been programmatically audited for file integrity, dimensions, and visual clarity. None are blank, corrupted, or 0 bytes.

| Filename | Dimensions | File Size | Screen Route | What It Demonstrates | Integrity Status |
| :--- | :---: | :---: | :--- | :--- | :---: |
| `landing_dark.png` | 1920×912 | 685.9 KB | `/` (Dark Theme) | Executive Hero landing page showcasing architecture badges (78 Tests, Java 25, PostgreSQL 16), feature cards, and quick-action navigation. | **VERIFIED** (Valid PNG) |
| `landing_light.png` | 1920×912 | 755.6 KB | `/` (Light Theme) | Executive Hero landing page rendered under light theme, verifying WCAG contrast compliance and responsive typography. | **VERIFIED** (Valid PNG) |
| `mobile_390_landing.png` | 628×939 | 355.6 KB | `/` (Mobile Viewport) | Responsive mobile viewport rendering of executive landing page on simulated iPhone/Android 390px display. | **VERIFIED** (Valid PNG) |
| `dashboard.png` | 1920×912 | 213.3 KB | `/admin` | Admin Live Pipeline Monitor showing active payment counters, status breakdown cards, and recent transactions. | **VERIFIED** (Valid PNG) |
| `smoke_live_monitor.png` | 1280×840 | 105.0 KB | `/admin` (Live Stream) | Admin live dashboard actively streaming real-time Server-Sent Events (SSE) payment state transitions without page refresh. | **VERIFIED** (Valid PNG) |
| `mobile_390_dashboard.png` | 1920×912 | 214.2 KB | `/admin` (Responsive) | Admin live dashboard rendered on mobile viewport with condensed metrics grid and collapsible navigation. | **VERIFIED** (Valid PNG) |
| `smoke_admin_login.png` | 1280×800 | 39.3 KB | `/admin/login` | Secure administrative authentication form with username/password inputs, rate limiting protection, and JWT token issuance. | **VERIFIED** (Valid PNG) |
| `smoke_admin_payments.png` | 1280×840 | 134.3 KB | `/admin/payments` | Master audit ledger displaying filtered transaction records, idempotency keys, payment states, and retry count badges. | **VERIFIED** (Valid PNG) |
| `payment_drawer.png` | 1920×912 | 258.4 KB | `/admin/payments` (Drawer) | Detailed slide-out audit drawer displaying payment attempts history, SHA-256 payload digest, bank references, and millisecond timestamps. | **VERIFIED** (Valid PNG) |
| `chaos_lab.png` | 1920×912 | 208.8 KB | `/admin/lab` | Chaos Engineering Lab control panel with failure sliders (timeout rate, error rate, latency delay) and chaos preset buttons. | **VERIFIED** (Valid PNG) |
| `lab_while_running.png` | 1920×912 | 214.4 KB | `/admin/lab` (Active) | Chaos Lab during an active benchmark run showing injected failure metrics and real-time execution feedback. | **VERIFIED** (Valid PNG) |
| `compare_dark.png` | 1920×912 | 252.6 KB | `/admin/compare` (Dark) | Side-by-side protocol comparison dashboard highlighting 0 duplicate charges in PROTECTED vs. duplicate debits in NAIVE under 30% chaos. | **VERIFIED** (Valid PNG) |
| `compare_light.png` | 1920×912 | 253.8 KB | `/admin/compare` (Light) | Side-by-side protocol comparison rendered in light mode showing duplicate financial loss metrics and recovery latency bars. | **VERIFIED** (Valid PNG) |
| `mobile_390_compare.png` | 1920×912 | 255.4 KB | `/admin/compare` (Mobile) | Responsive mobile view of the protocol compare dashboard for on-device presentation during reviews. | **VERIFIED** (Valid PNG) |
| `smoke_app_progress.png` | 440×900 | 86.3 KB | `/app` (In Flight) | Customer Mobile PWA showing real-time payment progress bar, optimistic feedback, and SSE status streaming. | **VERIFIED** (Valid PNG) |

---

## 2. Missing Screens & Manual Capture Instructions

While the 15 screenshots above cover all core features necessary for Review 3 and academic defense, the following secondary screens are not yet indexed in `docs/screenshots/`:

| Missing Screen Route | Screen Name | Why It Is Useful | Recommended Capture Action |
| :--- | :--- | :--- | :--- |
| `/app` | Customer Checkout (Idle) | Shows the clean mobile checkout form with amount input and "Pay" button before submission. | Open `http://localhost:5173/app` in mobile emulation (390×844) and save as `docs/screenshots/app_checkout_idle.png`. |
| `/app/activity` | Customer Activity History | Shows the list of completed and refunded transactions from the customer's perspective. | Make a test payment on `/app`, click "Activity" tab, and save as `docs/screenshots/app_activity_history.png`. |
| `/app/about` | Mobile About View | Displays project details, authors, and architecture overview on mobile viewports. | Navigate to `http://localhost:5173/app/about` and save as `docs/screenshots/app_about_mobile.png`. |
| `/admin/system` | System Health Monitor | Shows backend microservice status, database ping, and inter-service health check cards. | Log in to Admin, navigate to `/admin/system`, and save as `docs/screenshots/admin_system_health.png`. |
| `http://localhost:8080/swagger-ui/index.html` | OpenAPI / Swagger UI | Demonstrates REST API contracts, request/response schemas, and parameter validation. | Open Swagger UI in browser, capture 1280×800 screenshot, and save as `docs/screenshots/swagger_ui.png`. |

---

## 3. How to Update or Re-Capture Screenshots

To capture fresh high-resolution screenshots from a running local instance:

1. **Start the local Docker stack and frontend**:
   ```bash
   docker compose up -d
   cd frontend && npm run dev
   ```
2. **Open Google Chrome DevTools**:
   - Press `F12` $\rightarrow$ Toggle Device Toolbar (`Ctrl+Shift+M`).
   - For desktop screens: select **Responsive**, set dimensions to **1920 × 912**, DPR **1.0**.
   - For mobile screens: select **iPhone 14 / iPhone 12 Pro**, set dimensions to **390 × 844**, DPR **2.0**.
3. **Capture Screenshot**:
   - Press `Ctrl+Shift+P` $\rightarrow$ type `Capture screenshot` $\rightarrow$ hit Enter.
   - Save the file directly into `docs/screenshots/<name>.png`.
4. **Audit and Commit**:
   - Verify file size is between 30 KB and 800 KB (no blank or 0-byte images).
   - Commit with message: `docs(screenshots): update UI captures for <screen>`.

