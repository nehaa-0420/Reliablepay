# Phase 0 — Foundation check

Read AGENTS.md, docs/PROJECT_SUMMARY.md, docs/BUILD_PLAN.md and docs/PHASES.md first.
Work ONLY on Phase 0.

Goal: confirm the scaffold builds and runs locally.

Tasks
1. Build backend/payment-service and backend/mock-bank with Maven (`mvn -q -DskipTests package`).
   If the pom.xml versions fail, fix them and explain what changed.
2. Install frontend dependencies and run `npm run build` in /frontend.
3. Run `docker compose up --build`. Both services must start, run Flyway without errors, and
   respond on /actuator/health (8080 and 8081).
4. Add a minimal CORS configuration to payment-service reading app.cors-allowed-origins.
5. Initialise git conventions: .gitignore check, one clean first commit message suggestion.

Acceptance (paste real output)
- `curl localhost:8080/actuator/health` and `curl localhost:8081/actuator/health` show {"status":"UP"}
- `npm run build` succeeds
Finish with the report format from AGENTS.md.
