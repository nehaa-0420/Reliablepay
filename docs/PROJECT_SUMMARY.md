# Project Summary (hand-off document for any agent)

## One line
A payment processing system that stays correct when things fail: it never double-charges,
retries transient failures safely, tracks every payment through a state machine, resolves
payments whose outcome is unknown, and proves all this with measured experiments.

## Context
- 3rd-year B.Tech IT student project (team of 4, student is team lead). Design Project, Alliance University.
- Industry brief from Citi: "Design and Development of a Reliable Payment Processing System with
  Retry and Failure Handling". Faculty coordinator: Dr. K. Madheswari. Industry mentor: Mrithula KL.
- Review 2 is on 24 Oct 2026 (about 50% completion expected). Final system is graded later.
- The student wants to impress a jury: a live demo beats slides.

## Problem
Online payments fail for ordinary reasons (timeouts, gateway errors, broken handshakes). Naive
handling causes duplicate charges, stuck payments and inconsistent records.

## Objectives (max 3, chained)
1. Idempotent, retry-safe payment processing (no duplicate processing under retries).
2. Transaction state tracking and automated recovery (including UNKNOWN-outcome reconciliation).
3. Evaluate reliability under simulated failure and concurrent load (duplicate rate, retry success, recovery time).

## Base papers (chosen by the team; details to be verified from the full texts)
1. E-Financial Sentinel: Navigating India's Digital Transaction Landscape
2. Statistical and Data Analytics Approaches to Parameter Tuning for QoS of E-Banking Transactions
3. Failure Propagation in SAP MultiBank Payment Batches Due to Unsynchronized Secure Channel Negotiations
Plus ~10 supporting papers (see docs/LITERATURE_BASE_PAPERS.md). The "likely gaps" attached to the
base papers came from an AI-generated table and are UNVERIFIED.

## Key idea (the "wow" factor)
Same system, two modes: NAIVE (no idempotency, naive retry) vs PROTECTED (our engine). Under identical
injected failures, NAIVE shows double charges; PROTECTED shows zero. A chaos panel controls failure
rates; a reconciliation worker fixes UNKNOWN payments; batch payments show failure propagation
(naive: one bad channel negotiation fails the batch; protected: isolated per item).

## Architecture
React (Vercel) -> payment-service (Spring Boot, Render) -> mock-bank (Spring Boot, Render)
Both services -> PostgreSQL (Render; mock-bank uses schema "bank"). Redis is optional (flagged off by default).
Source of truth for idempotency = Postgres unique constraint.

## Payment states
INITIATED -> PROCESSING -> SUCCESS | FAILED | RETRYING | UNKNOWN | DEAD_LETTERED

## Decisions already made
- PostgreSQL (not MySQL) because Render offers managed Postgres. The brief allows either.
- Two backend services so failures are believable. Redis optional.
- Polling (2s) instead of WebSockets for the dashboard.
- Mock bank records every charge independently, so "double charges" are measured from ground truth.

## Status
Scaffold only (nothing compiled). Follow docs/PHASES.md. Prompts are in docs/prompts/.

## Risks
Free-tier hosting sleeps/cold-starts (wake services before a demo); limited time before Review 2;
literature table has weak entries that need cleanup; scaffold versions unverified.
