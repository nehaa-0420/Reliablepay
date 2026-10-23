# Script to build clean, logical git history for ReliablePay
$ErrorActionPreference = "Stop"

function Commit-Step($msg, $paths) {
    Write-Output "Committing: $msg"
    foreach ($p in $paths) {
        if (Test-Path $p) {
            git add $p
        }
    }
    git commit -m $msg --quiet
}

# 1. Project structure & gitignore
Commit-Step "chore: initialize project structure and gitignore" @(".gitignore")

# 2. Docs and specs
Commit-Step "docs: add project summary, build plan, and agent guidelines" @("AGENTS.md", "README.md", "docs/PROJECT_SUMMARY.md", "docs/BUILD_PLAN.md", "docs/PHASES.md", "docs/DB_SCHEMA.md", "docs/API_SPEC.md", "docs/LITERATURE_BASE_PAPERS.md", "docs/prompts")

# 3. payment-service build and entry
Commit-Step "build(payment-service): add payment-service Maven configuration and application setup" @("backend/payment-service/pom.xml", "backend/payment-service/src/main/resources/application.yml", "backend/payment-service/src/main/java/com/reliablepay/payment/PaymentServiceApplication.java")

# 4. payment-service migrations
Commit-Step "feat(payment-service): add Flyway schema migrations V1 for payments and audit tables" @("backend/payment-service/src/main/resources/db/migration/V1__init_payment_schema.sql")

# 5. payment models and DTOs
Commit-Step "feat(payment-service): implement payment entity, enums and request/response DTOs" @("backend/payment-service/src/main/java/com/reliablepay/payment/model", "backend/payment-service/src/main/java/com/reliablepay/payment/dto")

# 6. state machine
Commit-Step "feat(payment-service): implement payment state machine with lifecycle transition validation" @("backend/payment-service/src/main/java/com/reliablepay/payment/service/PaymentStateMachine.java", "backend/payment-service/src/main/java/com/reliablepay/payment/exception/InvalidStateTransitionException.java")

# 7. repository and controllers
Commit-Step "feat(payment-service): implement payment repository and create/read endpoints" @("backend/payment-service/src/main/java/com/reliablepay/payment/repository", "backend/payment-service/src/main/java/com/reliablepay/payment/controller/PaymentController.java", "backend/payment-service/src/main/java/com/reliablepay/payment/controller/GlobalExceptionHandler.java")

# 8. idempotency
Commit-Step "feat(payment-service): add transactional idempotency handling with replay detection" @("backend/payment-service/src/main/java/com/reliablepay/payment/service/PaymentService.java", "backend/payment-service/src/main/java/com/reliablepay/payment/exception/IdempotencyConflictException.java", "backend/payment-service/src/main/java/com/reliablepay/payment/idempotency")

# 9. payment core tests
Commit-Step "test(payment-service): add unit and integration test suite for payment core and idempotency" @("backend/payment-service/src/test/java/com/reliablepay/payment/PaymentServiceApplicationTests.java", "backend/payment-service/src/test/java/com/reliablepay/payment/controller/PaymentControllerIntegrationTest.java", "backend/payment-service/src/test/java/com/reliablepay/payment/service/PaymentStateMachineTest.java", "backend/payment-service/src/test/java/com/reliablepay/payment/idempotency")

# 10. mock-bank build
Commit-Step "build(mock-bank): add mock-bank Maven configuration and Spring Boot setup" @("backend/mock-bank/pom.xml", "backend/mock-bank/src/main/resources/application.yml", "backend/mock-bank/src/main/java/com/reliablepay/mockbank/MockBankApplication.java")

# 11. mock-bank schema and models
Commit-Step "feat(mock-bank): add bank charges schema migrations and domain models" @("backend/mock-bank/src/main/resources/db/migration", "backend/mock-bank/src/main/java/com/reliablepay/mockbank/model")

# 12. mock-bank charge and chaos
Commit-Step "feat(mock-bank): implement bank charge endpoint with timeout and error chaos injection" @("backend/mock-bank/src/main/java/com/reliablepay/mockbank/controller/BankController.java", "backend/mock-bank/src/main/java/com/reliablepay/mockbank/service/BankService.java", "backend/mock-bank/src/main/java/com/reliablepay/mockbank/exception", "backend/mock-bank/src/main/java/com/reliablepay/mockbank/controller/GlobalExceptionHandler.java")

# 13. mock-bank stats
Commit-Step "feat(mock-bank): implement order-level duplicate tracking and admin stats endpoints" @("backend/mock-bank/src/main/java/com/reliablepay/mockbank/dto", "backend/mock-bank/src/main/java/com/reliablepay/mockbank/repository")

# 14. mock-bank tests
Commit-Step "test(mock-bank): add unit tests for bank charge processing and chaos injection" @("backend/mock-bank/src/test/java/com/reliablepay/mockbank/BankServiceTest.java", "backend/mock-bank/src/test/java/com/reliablepay/mockbank/controller")

# 15. bank client
Commit-Step "feat(payment-service): implement resilient HTTP bank client with timeout handling" @("backend/payment-service/src/main/java/com/reliablepay/payment/client", "backend/payment-service/src/main/java/com/reliablepay/payment/config/BankProperties.java")

# 16. retry worker
Commit-Step "feat(payment-service): implement async payment processing and exponential backoff retry worker" @("backend/payment-service/src/main/java/com/reliablepay/payment/service/PaymentProcessingService.java", "backend/payment-service/src/main/java/com/reliablepay/payment/worker/PaymentRetryWorker.java", "backend/payment-service/src/main/java/com/reliablepay/payment/config/RetryProperties.java")

# 17. reconciliation worker
Commit-Step "feat(payment-service): implement UNKNOWN state reconciliation worker with skip-locked queries" @("backend/payment-service/src/main/java/com/reliablepay/payment/worker/PaymentReconciliationWorker.java", "backend/payment-service/src/main/java/com/reliablepay/payment/config/ReconcileProperties.java")

# 18. metrics and chaos proxy
Commit-Step "feat(payment-service): add metrics telemetry summary and chaos configuration proxies" @("backend/payment-service/src/main/java/com/reliablepay/payment/controller/MetricsController.java", "backend/payment-service/src/main/java/com/reliablepay/payment/controller/ChaosController.java", "backend/payment-service/src/main/java/com/reliablepay/payment/service/MetricsService.java")

# 19. experiment runner
Commit-Step "feat(payment-service): implement multi-threaded experiment runner and benchmark metrics" @("backend/payment-service/src/main/java/com/reliablepay/payment/service/ExperimentService.java", "backend/payment-service/src/main/java/com/reliablepay/payment/controller/ExperimentController.java", "backend/payment-service/src/main/java/com/reliablepay/payment/exception/ExperimentAlreadyRunningException.java")

# 20. retry & reconciliation tests
Commit-Step "test(payment-service): add test suites for retry engine and reconciliation worker" @("backend/payment-service/src/test/java/com/reliablepay/payment/service/PaymentRetryEngineTest.java", "backend/payment-service/src/test/java/com/reliablepay/payment/service/PaymentReconciliationTest.java")

# 21. frontend scaffold
Commit-Step "feat(frontend): scaffold React 18 and Vite app with custom fintech design system" @("frontend/package.json", "frontend/package-lock.json", "frontend/vite.config.js", "frontend/index.html", "frontend/src/styles", "frontend/src/main.jsx")

# 22. frontend layout & client
Commit-Step "feat(frontend): implement API client and global navigation layout with health monitoring" @("frontend/src/api", "frontend/src/components/Navbar.jsx", "frontend/src/components/ColdStartBanner.jsx", "frontend/src/components/StatusBadge.jsx", "frontend/src/components/MetricCard.jsx", "frontend/src/App.jsx", "frontend/src/pages/NotFoundPage.jsx")

# 23. landing page
Commit-Step "feat(frontend): implement landing page with visual payment journey and team credits" @("frontend/src/pages/LandingPage.jsx")

# 24. dashboard page
Commit-Step "feat(frontend): implement dashboard with live payments table and audit event drawer" @("frontend/src/pages/DashboardPage.jsx", "frontend/src/components/PaymentDrawer.jsx")

# 25. chaos lab & compare
Commit-Step "feat(frontend): implement chaos lab and head-to-head comparison page with Recharts" @("frontend/src/pages/ChaosLabPage.jsx", "frontend/src/pages/ComparePage.jsx")

# 26. dockerfiles & compose
Commit-Step "build(docker): add production multi-stage Dockerfiles and local docker-compose configuration" @("backend/payment-service/Dockerfile", "backend/payment-service/docker-entrypoint.sh", "backend/mock-bank/Dockerfile", "backend/mock-bank/docker-entrypoint.sh", "docker-compose.yml")

# 27. render blueprint and deployment guide
Commit-Step "feat(deploy): add Render blueprint, Vercel SPA rewrite, admin token guards and deployment guide" @("render.yaml", "frontend/vercel.json", "docs/DEPLOYMENT.md", "docs/UNATTENDED_LOG.md", "backend/payment-service/src/main/java/com/reliablepay/payment/config/AdminTokenInterceptor.java", "backend/payment-service/src/main/java/com/reliablepay/payment/config/CorsConfig.java", "backend/mock-bank/src/main/java/com/reliablepay/mockbank/config", "backend/payment-service/src/main/java/com/reliablepay/payment/controller/SystemController.java", "backend/payment-service/src/main/java/com/reliablepay/payment/exception/ExperimentBankUnavailableException.java")

# 28. remaining artifacts/scripts
git add -A
git status --porcelain
if ((git status --porcelain).Length -gt 0) {
    git commit -m "chore: add remaining test scripts and documentation references" --quiet
}

Write-Output "Commits created successfully."
