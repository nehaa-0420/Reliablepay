# ReliablePay — Team Collaboration & Git Contribution Workflow

**Document Purpose**: Standard operating procedures for project team members to clone the repository, configure personal git environments, add individual academic report chapters or presentation slides under `docs/team/<name>/`, run local verification checks, and open clean pull requests without introducing secrets or breaking changes.  
**Target Audience**: All team contributors, report co-authors, and presentation leads.

---

## 1. Quick Rules for All Contributors

1. **Never commit directly to `main`**: Always create a feature branch (`git checkout -b feature/<name>/<topic>`).
2. **Strict Zero-Secrets Policy**: Never commit `.env` files, production passwords, API tokens, JWT secrets, or bank API credentials. All secrets belong in `.env.local` (git-ignored) or environment variables.
3. **Workspace Isolation**: Put all your individual work (report drafts, slide decks, analysis notes, viva notes) in your dedicated team directory:  
   👉 **`docs/team/<your-name>/`**  
   Example: `docs/team/alice/chapter4_design.md` or `docs/team/bob/final_slides.pptx`.
4. **Clean Git History**: Never run destructive git commands (`git reset --hard`, `git push --force`, `git checkout --`, `git stash drop`). Use standard commits with descriptive messages.
5. **Pre-Push Verification**: Always ensure existing automated tests still pass before pushing to GitHub:
   - Backend tests: `mvn test` in both `backend/payment-service` and `backend/mock-bank` (78 tests total).
   - Frontend build: `npm run build` in `frontend` (0 build errors).

---

## 2. Step-by-Step Teammate Onboarding Guide

### Step 1: Clone the Repository
Clone the official team repository to your local computer:

```bash
git clone https://github.com/<your-org>/payment-reliability-system.git
cd payment-reliability-system
```

### Step 2: Configure Your Personal Git Identity
Set your own name and university/corporate email address for this repository so your commits are properly attributed to you:

```bash
git config user.name "Your Full Name"
git config user.email "your.email@university.edu"

# Verify your configuration:
git config user.name
git config user.email
```

### Step 3: Fetch the Latest Changes & Create a Feature Branch
Ensure you are branching off the latest `main`:

```bash
git checkout main
git pull origin main
git checkout -b feature/<your-name>/<topic>
```
*Example*: `git checkout -b feature/rahul/literature-review` or `git checkout -b feature/priya/slide-deck`.

---

## 3. Working in Your Team Folder (`docs/team/<your-name>/`)

To prevent merge conflicts when multiple teammates work on academic documentation simultaneously, each teammate has their own dedicated directory.

### Directory Structure:
```text
docs/team/
├── .gitkeep
├── rahul/
│   ├── literature_review.md
│   └── notes_on_citi_requirements.md
├── priya/
│   ├── presentation_deck_draft.pptx
│   └── viva_practice_questions.md
└── arjun/
    └── empirical_analysis.xlsx
```

### Adding Your Work:
1. Create your folder if it does not already exist:
   ```bash
   mkdir -p docs/team/<your-name>
   ```
2. Add your files, notes, draft sections, or assets into this folder.
3. Link your deliverables back to the central report outlines in [`docs/handoff/REPORT_OUTLINE.md`](handoff/REPORT_OUTLINE.md) or [`docs/handoff/PPT_OUTLINE.md`](handoff/PPT_OUTLINE.md).

---

## 4. Secret Prevention & Pre-Commit Hygiene

Before staging files, verify that no confidential tokens or temporary build artifacts are being tracked:

```bash
# Check git status for unexpected files:
git status
```

### Forbidden Files (Never Commit):
- ❌ `.env`, `.env.local`, `.env.production`
- ❌ Private keys (`*.pem`, `*.key`, `*.p12`)
- ❌ Build outputs (`target/`, `node_modules/`, `dist/`)
- ❌ OS/IDE noise (`.idea/`, `.vscode/`, `.DS_Store`, `Thumbs.db`)

If you accidentally created a sensitive file, ensure it is added to `.gitignore`. If it was already staged, unstage it with:
```bash
git restore --staged <file>
```

---

## 5. Local Verification Before Pushing

Before opening a pull request, run the test suites to ensure zero regressions:

```bash
# 1. Test Mock Bank microservice (9 tests):
cd backend/mock-bank
mvn test

# 2. Test Payment Service microservice (69 tests):
cd ../payment-service
mvn test

# 3. Test Frontend build:
cd ../../frontend
npm run build
```

All 78 backend tests must pass, and the Vite production bundle must build with 0 errors.

---

## 6. Committing and Opening a Pull Request

### Step 1: Stage and Commit
Commit your changes with clear, semantic commit messages:

```bash
git add docs/team/<your-name>/
git commit -m "docs(team): add literature review draft and evaluation notes by <your-name>"
```

### Step 2: Push Your Branch to GitHub
```bash
git push -u origin feature/<your-name>/<topic>
```

### Step 3: Open a Pull Request (PR)
1. Go to the GitHub repository page.
2. Click **Compare & pull request** next to your pushed branch.
3. Fill in the PR description:
   - **What changed**: Summary of documentation or code added.
   - **Verification**: State that `mvn test` and `npm run build` passed.
   - **Safety check**: Confirm no secrets or personal credentials were included.
4. Request review from at least one teammate.
5. Once approved, use **Squash and Merge** or **Rebase and Merge** to integrate cleanly into `main`.

---

## 7. Handling Merge Conflicts Safely

If `main` has advanced while you were working on your branch:

```bash
# 1. Switch to main and update:
git checkout main
git pull origin main

# 2. Switch back to your feature branch and rebase:
git checkout feature/<your-name>/<topic>
git rebase main

# 3. If there are conflicts, resolve them in VS Code, then:
git add <resolved-files>
git rebase --continue

# 4. Push updated branch (force-with-lease only on your private feature branch):
git push --force-with-lease origin feature/<your-name>/<topic>
```
*(Note: Never force-push to `main`).*
