# Literature: base papers and supporting work

## Base papers (fill authors/year/venue from the real papers)
| # | Title | Authors / Year / Venue | Verified gap (write after reading) | Design hook in this project |
|---|---|---|---|---|
| B1 | E-Financial Sentinel: Navigating India's Digital Transaction Landscape | TODO | TODO | Context for Indian digital payments; audit/event logging; compliance-aware design notes |
| B2 | Statistical and Data Analytics Approaches to Parameter Tuning for QoS of E-Banking Transactions | TODO | TODO | Retry parameters (max attempts, backoff, timeout) tuned via experiments; QoS metrics |
| B3 | Failure Propagation in SAP MultiBank Payment Batches Due to Unsynchronized Secure Channel Negotiations | TODO | TODO | Batch payments + "channel negotiation failure" injected in mock bank; isolation per item |

IMPORTANT: the "likely gaps" seen so far were produced by an AI table and not read from the papers.
Do not present them to the jury until checked against each paper's abstract, discussion and conclusion.
The "design hook" column is derived from the titles only. Adjust after reading.

## Supporting papers (from the team's literature table)
1. Bygari et al., IEEE Big Data 2021 — ML routing of payments at Razorpay
2. Qi, Liu, Jin, ACM SOSP 2023 — Halfmoon, exactly-once retries in serverless
3. Fan, Liu, Yin, Wang, J. Cloud Computing 2020 — 2PC* with compensation
4. Unlu et al., IEEE ICHORA 2026 — pre-authorised async payments (verify figures)
5. Abdullah & Aloufi, IEEE 2023 — Dead Letter Exchanges in MQTT
6. Psarakis et al., VLDB Journal 2026 — State migration in Styx
7. AI-driven multibank payment orchestration, Discover AI 2026 (author unclear)
8. van Glabbeek et al., Distributed Computing 2023 — cross-chain payment protocols
9. Kiran et al., 2022 — MFA mobile payments (weak fit; consider replacing)
10. Chauhan & Saini, IEEE 2024 — blockchain payments survey

## Gap framing (use "within the papers we reviewed")
G1: no application-level, payment-specific mechanism combining idempotency + retry + persistent state without special runtime or coordinator.
G2: evaluations report throughput/latency/success rate, not correctness under injected failure (duplicate rate, recovery time).
G3: unknown-outcome payments (timeout/crash) are not addressed.
Re-check G1-G3 against the three base papers once they are read.
