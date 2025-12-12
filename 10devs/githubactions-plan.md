# GitHub Actions Workflow Plan

## "Czy ulica stoi?" - CI/CD Workflow Implementation Guide

**Created:** December 12, 2025
**Project:** Traffic Monitoring Application
**Owner:** Grzegorz Malopolski

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Prerequisites](#2-prerequisites)
3. [Workflow Goals](#3-workflow-goals)
4. [Workflow Triggers](#4-workflow-triggers)
5. [Workflow Jobs Structure](#5-workflow-jobs-structure)
6. [Step-by-Step Implementation Plan](#6-step-by-step-implementation-plan)
7. [Complete Workflow File](#7-complete-workflow-file)
8. [Testing the Workflow](#8-testing-the-workflow)
9. [Troubleshooting](#9-troubleshooting)
10. [Future Enhancements](#10-future-enhancements)

---

## 1. Executive Summary

This document provides a comprehensive plan to implement GitHub Actions CI/CD workflow for the "Czy ulica stoi?" project. The workflow will:

✅ **Analyze code** (non-blocking) - ESLint, TypeScript check
✅ **Build project** - Vite production build
✅ **Run tests** - Vitest (when implemented)
✅ **Cache dependencies** - Faster subsequent runs
✅ **Generate artifacts** - Build output for deployment

**Triggers:**
- Push to `develop` branch
- Push to `feature/*` branches
- Pull request creation/update

---

## 2. Prerequisites

### 2.1 Repository Requirements

- ✅ GitHub repository with code
- ✅ Node.js project with `package.json`
- ✅ npm scripts defined: `build`, `lint`

### 2.2 Current Project Setup

**Package Manager:** npm (or bun as alternative)

**Available npm Scripts:**
```json
{
  "dev": "vite",
  "build": "vite build",
  "build:dev": "vite build --mode development",
  "lint": "eslint .",
  "preview": "vite preview"
}
```

**Missing Scripts** (to be added):
```json
{
  "test": "vitest",              // When tests are implemented
  "test:ci": "vitest run",       // CI mode (no watch)
  "type-check": "tsc --noEmit"   // TypeScript validation
}
```

### 2.3 Technologies Used

- **Build Tool:** Vite 5.4.19
- **Language:** TypeScript 5.8.3
- **Linter:** ESLint 9.32.0
- **Framework:** React 18.3.1
- **Testing:** Vitest (recommended, not yet implemented)

---

## 3. Workflow Goals

### 3.1 Primary Goals

| Goal | Description | Priority |
|------|-------------|----------|
| **Code Quality** | Ensure code meets ESLint standards | 🔴 Critical |
| **Type Safety** | Validate TypeScript types | 🔴 Critical |
| **Build Success** | Verify project builds without errors | 🔴 Critical |
| **Test Coverage** | Run unit/integration tests (when available) | 🟡 High |
| **Fast Feedback** | Provide results in <5 minutes | 🟡 High |

### 3.2 Non-Goals (Out of Scope)

❌ Deployment to production (handled by Lovable platform)
❌ Performance testing
❌ Security scanning (SAST/DAST)
❌ Browser compatibility testing

---

## 4. Workflow Triggers

### 4.1 Trigger Configuration

The workflow should run on these events:

```yaml
on:
  # Trigger on push to develop branch
  push:
    branches:
      - develop
      - 'feature/**'  # Any branch starting with feature/

  # Trigger on pull requests to develop or main
  pull_request:
    branches:
      - develop
      - main
    types:
      - opened
      - synchronize
      - reopened

  # Allow manual trigger from GitHub UI
  workflow_dispatch:
```

### 4.2 Trigger Scenarios

| Event | When It Triggers | Example |
|-------|------------------|---------|
| **Push to develop** | Direct commit or merge to develop | `git push origin develop` |
| **Push to feature/** | Commit to feature branch | `git push origin feature/add-notifications` |
| **Pull Request** | PR opened, updated, or reopened | Create PR to develop |
| **Manual Trigger** | Click "Run workflow" in GitHub UI | For debugging |

### 4.3 Branches Not Covered

- `main` branch (assumed production, handled by Lovable)
- Branches not matching `feature/**` pattern (e.g., `bugfix/`, `hotfix/`)
- Tags and releases

**Recommendation:** Add `bugfix/**` and `hotfix/**` patterns if used.

---

## 5. Workflow Jobs Structure

### 5.1 Job Overview

The workflow consists of **3 jobs** that run in sequence:

```
┌─────────────────┐
│  1. CODE        │  Non-blocking analysis
│     ANALYSIS    │  - ESLint check
│                 │  - TypeScript check
│                 │  - continue-on-error: true
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  2. TEST        │  Run unit/integration tests
│                 │  - Vitest (when implemented)
│                 │  - MUST pass to continue
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  3. BUILD       │  Production build
│                 │  - Vite build
│                 │  - Upload artifacts
│                 │  - MUST pass
└─────────────────┘
```

### 5.2 Why This Structure?

**Sequential Execution:**
- Code analysis first (fast, provides early feedback)
- Tests next (verify functionality)
- Build last (most expensive, only if tests pass)

**Non-Blocking Analysis:**
- Analysis job uses `continue-on-error: true`
- Workflow proceeds even if ESLint/TypeScript errors exist
- Useful for gradual code quality improvement
- Errors are still visible in PR comments

---

## 6. Step-by-Step Implementation Plan

### Phase 1: Create Workflow Directory

**Step 1.1:** Create `.github/workflows` directory

```bash
mkdir -p .github/workflows
```

**Step 1.2:** Create workflow file

```bash
touch .github/workflows/ci.yml
```

**Location:** `/Users/gmalopolski/GitHub/stop-watch-polish/.github/workflows/ci.yml`

---

### Phase 2: Add TypeScript Check Script

**Step 2.1:** Add `type-check` script to `package.json`

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:dev": "vite build --mode development",
    "lint": "eslint .",
    "preview": "vite preview",
    "type-check": "tsc --noEmit"
  }
}
```

**Purpose:** Validates TypeScript without emitting files (faster than full build)

---

### Phase 3: Define Workflow Metadata

**Step 3.1:** Add workflow name and triggers

```yaml
name: CI Pipeline

on:
  push:
    branches:
      - develop
      - 'feature/**'
  pull_request:
    branches:
      - develop
      - main
    types:
      - opened
      - synchronize
      - reopened
  workflow_dispatch:

# Cancel in-progress runs for same branch/PR
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

**Explanation:**
- `name`: Display name in GitHub Actions UI
- `on`: Trigger conditions
- `concurrency`: Cancel old runs when new commit pushed (saves CI minutes)

---

### Phase 4: Job 1 - Code Analysis

**Step 4.1:** Add environment variables (optional)

```yaml
env:
  NODE_VERSION: '20'
  CACHE_KEY_PREFIX: 'node-modules'
```

**Step 4.2:** Define code-analysis job

```yaml
jobs:
  code-analysis:
    name: 📊 Code Analysis
    runs-on: ubuntu-latest
    continue-on-error: true  # Non-blocking

    steps:
      - name: 📥 Checkout code
        uses: actions/checkout@v4

      - name: 🔧 Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: 📦 Install dependencies
        run: npm ci

      - name: 🔍 Run ESLint
        run: npm run lint
        continue-on-error: true  # Don't fail on lint errors

      - name: 🔎 TypeScript Check
        run: npm run type-check
        continue-on-error: true  # Don't fail on type errors

      - name: 📝 Comment PR (if applicable)
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '✅ Code analysis completed. Check logs for details.'
            })
```

**Key Features:**
- `continue-on-error: true` at job level - never fails workflow
- Separate steps for ESLint and TypeScript
- PR comment for visibility
- Uses `npm ci` (faster, deterministic installs)

---

### Phase 5: Job 2 - Tests

**Step 5.1:** Define test job (depends on nothing, runs in parallel)

```yaml
  test:
    name: 🧪 Tests
    runs-on: ubuntu-latest
    # Remove this line when tests are implemented:
    if: false  # Skip until tests exist

    steps:
      - name: 📥 Checkout code
        uses: actions/checkout@v4

      - name: 🔧 Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: 📦 Install dependencies
        run: npm ci

      - name: 🧪 Run tests
        run: npm run test:ci
        env:
          CI: true

      - name: 📊 Upload coverage
        if: always()
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella
```

**Important:**
- `if: false` temporarily disables job (remove when tests added)
- `CI: true` environment variable (some test runners use this)
- Coverage upload (optional, requires Codecov account)

---

### Phase 6: Job 3 - Build

**Step 6.1:** Define build job (depends on tests passing)

```yaml
  build:
    name: 🏗️ Build
    runs-on: ubuntu-latest
    # Wait for tests to pass (remove 'test' when if: false is active)
    # needs: [test]

    steps:
      - name: 📥 Checkout code
        uses: actions/checkout@v4

      - name: 🔧 Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: 📦 Install dependencies
        run: npm ci

      - name: 🏗️ Build project
        run: npm run build
        env:
          # Vite environment variables
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}

      - name: 📤 Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: dist-${{ github.sha }}
          path: dist/
          retention-days: 7

      - name: 📊 Build size report
        run: |
          echo "## Build Output" >> $GITHUB_STEP_SUMMARY
          echo "\`\`\`" >> $GITHUB_STEP_SUMMARY
          du -sh dist/ >> $GITHUB_STEP_SUMMARY
          ls -lh dist/ >> $GITHUB_STEP_SUMMARY
          echo "\`\`\`" >> $GITHUB_STEP_SUMMARY
```

**Key Features:**
- `needs: [test]` - only runs if tests pass
- Environment variables from GitHub Secrets
- Upload `dist/` folder as artifact
- Build size summary in GitHub UI

---

### Phase 7: Add GitHub Secrets

**Step 7.1:** Add environment variables to GitHub Secrets

Go to: **Repository Settings > Secrets and variables > Actions > New repository secret**

Add these secrets:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key

**⚠️ Important:** These are needed for build to succeed.

---

### Phase 8: Enhanced Features (Optional)

#### 8.1 Dependency Caching

Already included via `actions/setup-node@v4` with `cache: 'npm'`

Benefits:
- 30-60% faster runs
- Automatic cache invalidation on `package-lock.json` change

#### 8.2 Matrix Strategy (Multi-Node Versions)

```yaml
build:
  strategy:
    matrix:
      node-version: [18, 20]

  steps:
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
```

**Trade-off:** 2x CI minutes usage

#### 8.3 ESLint Annotations in PR

```yaml
- name: 🔍 Run ESLint with annotations
  uses: reviewdog/action-eslint@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    reporter: github-pr-review
    eslint_flags: '.'
```

**Benefit:** ESLint errors appear as inline PR comments

#### 8.4 Build Time Tracking

```yaml
- name: ⏱️ Track build time
  run: |
    START_TIME=$(date +%s)
    npm run build
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    echo "Build took ${DURATION}s" >> $GITHUB_STEP_SUMMARY
```

---

## 7. Complete Workflow File

### 7.1 Full `ci.yml` File

```yaml
name: CI Pipeline

on:
  push:
    branches:
      - develop
      - 'feature/**'
  pull_request:
    branches:
      - develop
      - main
    types:
      - opened
      - synchronize
      - reopened
  workflow_dispatch:

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  NODE_VERSION: '20'

jobs:
  # ====================================
  # JOB 1: CODE ANALYSIS (Non-blocking)
  # ====================================
  code-analysis:
    name: 📊 Code Analysis
    runs-on: ubuntu-latest
    continue-on-error: true

    steps:
      - name: 📥 Checkout code
        uses: actions/checkout@v4

      - name: 🔧 Setup Node.js ${{ env.NODE_VERSION }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: 📦 Install dependencies
        run: npm ci

      - name: 🔍 Run ESLint
        run: npm run lint
        continue-on-error: true

      - name: 🔎 TypeScript Check
        run: npm run type-check
        continue-on-error: true

      - name: 📝 Analysis Summary
        if: always()
        run: |
          echo "## 📊 Code Analysis Results" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "✅ ESLint check completed" >> $GITHUB_STEP_SUMMARY
          echo "✅ TypeScript check completed" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "⚠️ Note: Analysis is non-blocking. Check logs for details." >> $GITHUB_STEP_SUMMARY

  # ====================================
  # JOB 2: TESTS (Blocking - when implemented)
  # ====================================
  test:
    name: 🧪 Tests
    runs-on: ubuntu-latest
    if: false  # TODO: Remove when tests are implemented

    steps:
      - name: 📥 Checkout code
        uses: actions/checkout@v4

      - name: 🔧 Setup Node.js ${{ env.NODE_VERSION }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: 📦 Install dependencies
        run: npm ci

      - name: 🧪 Run tests
        run: npm run test:ci
        env:
          CI: true

      - name: 📊 Upload coverage
        if: always()
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          flags: unittests

  # ====================================
  # JOB 3: BUILD (Blocking)
  # ====================================
  build:
    name: 🏗️ Build
    runs-on: ubuntu-latest
    # Uncomment when tests are enabled:
    # needs: [test]

    steps:
      - name: 📥 Checkout code
        uses: actions/checkout@v4

      - name: 🔧 Setup Node.js ${{ env.NODE_VERSION }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: 📦 Install dependencies
        run: npm ci

      - name: 🏗️ Build project
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}

      - name: 📤 Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: dist-${{ github.sha }}
          path: dist/
          retention-days: 7

      - name: 📊 Build size report
        run: |
          echo "## 🏗️ Build Results" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "### Build Output Size" >> $GITHUB_STEP_SUMMARY
          echo "\`\`\`" >> $GITHUB_STEP_SUMMARY
          du -sh dist/ >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "Files:" >> $GITHUB_STEP_SUMMARY
          ls -lh dist/ | tail -n +2 >> $GITHUB_STEP_SUMMARY
          echo "\`\`\`" >> $GITHUB_STEP_SUMMARY

      - name: ✅ Success message
        run: |
          echo "## ✅ Workflow Completed Successfully" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "- Code analysis: ✅ Completed (non-blocking)" >> $GITHUB_STEP_SUMMARY
          echo "- Build: ✅ Passed" >> $GITHUB_STEP_SUMMARY
          echo "- Artifacts: ✅ Uploaded (available for 7 days)" >> $GITHUB_STEP_SUMMARY
```

---

## 8. Testing the Workflow

### 8.1 Pre-Commit Checklist

Before pushing to trigger the workflow:

- [ ] Workflow file created at `.github/workflows/ci.yml`
- [ ] `type-check` script added to `package.json`
- [ ] GitHub Secrets configured (if using)
- [ ] Syntax validated (YAML linter)

### 8.2 Local Validation

**Validate YAML syntax:**
```bash
# Using yamllint (install: brew install yamllint)
yamllint .github/workflows/ci.yml

# Or use online validator: https://www.yamllint.com/
```

**Test npm scripts locally:**
```bash
npm run lint          # Should complete
npm run type-check    # Should complete
npm run build         # Should create dist/ folder
```

### 8.3 First Run

**Step 1:** Create feature branch
```bash
git checkout -b feature/add-github-actions
```

**Step 2:** Commit workflow file
```bash
git add .github/workflows/ci.yml
git add package.json  # If modified
git commit -m "Add GitHub Actions CI workflow"
```

**Step 3:** Push to GitHub
```bash
git push origin feature/add-github-actions
```

**Step 4:** Watch workflow run
- Go to: https://github.com/USERNAME/REPO/actions
- Click on latest workflow run
- Monitor each job's progress

### 8.4 Expected Results

**First Run:**
- ✅ Code analysis: Completes (may show warnings)
- ⏭️ Tests: Skipped (`if: false`)
- ✅ Build: Should succeed (if secrets configured)

**Timing:**
- First run: ~3-5 minutes (no cache)
- Subsequent runs: ~1-2 minutes (with cache)

---

## 9. Troubleshooting

### 9.1 Common Issues

#### Issue 1: Build Fails - Missing Environment Variables

**Error:**
```
Error: Missing VITE_SUPABASE_URL environment variable
```

**Solution:**
1. Go to: Repository Settings > Secrets and variables > Actions
2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
3. Re-run workflow

---

#### Issue 2: ESLint Errors Fail Workflow

**Error:**
```
ESLint found 42 errors
Process completed with exit code 1
```

**Solution:**
Verify `continue-on-error: true` is set:
```yaml
- name: 🔍 Run ESLint
  run: npm run lint
  continue-on-error: true  # ← Must be present
```

---

#### Issue 3: npm ci Fails

**Error:**
```
npm ERR! The package-lock.json file doesn't match package.json
```

**Solution:**
```bash
# Locally regenerate lock file
rm package-lock.json
npm install
git add package-lock.json
git commit -m "Update package-lock.json"
git push
```

---

#### Issue 4: TypeScript Check Fails

**Error:**
```
error TS2304: Cannot find name 'process'
```

**Solution:**
Ensure `@types/node` is in `devDependencies`:
```bash
npm install --save-dev @types/node
```

---

#### Issue 5: Workflow Doesn't Trigger

**Possible causes:**
1. Branch name doesn't match pattern (must be `develop` or `feature/*`)
2. Workflow file not in `main` or `develop` branch
3. Syntax error in YAML

**Solution:**
- Check branch name: `git branch`
- Validate YAML syntax
- Ensure workflow file committed to correct branch

---

### 9.2 Debugging Tips

**View raw logs:**
```bash
# Download logs via GitHub CLI
gh run download <run-id>
```

**Test specific job locally:**
```bash
# Install act (GitHub Actions local runner)
brew install act

# Run workflow locally
act -j build
```

**Check workflow syntax:**
```bash
# Use actionlint
brew install actionlint
actionlint .github/workflows/ci.yml
```

---

## 10. Future Enhancements

### 10.1 Short-Term (Next 2 Weeks)

- [ ] Add `test` script to `package.json`
- [ ] Remove `if: false` from test job
- [ ] Enable test coverage reports
- [ ] Add ESLint annotations in PRs

### 10.2 Medium-Term (Next Month)

- [ ] Add Playwright E2E tests to workflow
- [ ] Implement lighthouse performance checks
- [ ] Add bundle size tracking
- [ ] Set up Codecov integration

### 10.3 Long-Term (Next Quarter)

- [ ] Add deployment preview for PRs
- [ ] Implement semantic versioning
- [ ] Add security scanning (Snyk, Dependabot)
- [ ] Create reusable workflow for Edge Functions

---

## 11. Workflow Optimization

### 11.1 Performance Optimization

**Current Performance:**
- First run: ~3-5 minutes
- Cached run: ~1-2 minutes

**Optimization Opportunities:**

#### A. Parallel Job Execution

Run code-analysis and test jobs in parallel:
```yaml
build:
  needs: [code-analysis, test]  # Wait for both
```

**Savings:** ~1 minute

#### B. Conditional Steps

Skip steps based on file changes:
```yaml
- name: 🔍 Run ESLint
  if: contains(github.event.head_commit.modified, '.ts') || contains(github.event.head_commit.modified, '.tsx')
  run: npm run lint
```

**Savings:** Variable (depends on changes)

#### C. Sparse Checkout

Only checkout necessary files:
```yaml
- uses: actions/checkout@v4
  with:
    sparse-checkout: |
      src/
      public/
      package.json
      vite.config.ts
```

**Savings:** ~10-20 seconds

### 11.2 Cost Optimization

**Current Monthly Usage Estimate:**
- Runs per day: ~10 (develop + features)
- Run duration: ~2 minutes (cached)
- Monthly minutes: ~600 minutes

**Free Tier:** 2,000 minutes/month (GitHub Free)
**Verdict:** ✅ Well within limits

**Cost Reduction Strategies:**
1. Use `concurrency` to cancel redundant runs ✅ (already implemented)
2. Skip workflows for documentation-only changes
3. Use self-hosted runners (advanced)

---

## 12. Monitoring & Metrics

### 12.1 Key Metrics to Track

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Workflow Success Rate** | >95% | GitHub Actions dashboard |
| **Average Run Time** | <3 min | Workflow logs |
| **Cache Hit Rate** | >80% | Cache logs |
| **Build Size** | <5 MB | Build artifacts |
| **Failure Root Cause** | Track top 5 | Manual analysis |

### 12.2 Alerts & Notifications

**Setup Slack/Discord Webhook:**
```yaml
- name: 🔔 Notify on failure
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    webhook-url: ${{ secrets.SLACK_WEBHOOK }}
    payload: |
      {
        "text": "❌ Build failed: ${{ github.repository }}"
      }
```

---

## 13. Security Considerations

### 13.1 Secrets Management

**Best Practices:**
- ✅ Use GitHub Secrets for sensitive data
- ✅ Never log secret values
- ✅ Rotate secrets regularly
- ✅ Use least-privilege principle

**Example - Masking Secrets:**
```yaml
- name: 🔐 Mask sensitive data
  run: |
    echo "::add-mask::${{ secrets.VITE_SUPABASE_KEY }}"
```

### 13.2 Dependency Security

**Add Dependabot:**

Create `.github/dependabot.yml`:
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
```

**Benefits:**
- Automatic dependency updates
- Security vulnerability alerts
- Compatible with GitHub Actions

---

## 14. Advanced Workflows

### 14.1 Deployment Workflow (Future)

```yaml
name: Deploy to Staging

on:
  push:
    branches:
      - develop

jobs:
  deploy:
    needs: [build]
    runs-on: ubuntu-latest
    steps:
      - name: 📥 Download artifacts
        uses: actions/download-artifact@v4
        with:
          name: dist-${{ github.sha }}

      - name: 🚀 Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

### 14.2 Release Workflow

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: 📦 Create Release
        uses: softprops/action-gh-release@v1
        with:
          generate_release_notes: true
          files: |
            dist/**
```

---

## 15. Checklist: Implementation Steps

### Phase 1: Setup (Day 1)

- [ ] Create `.github/workflows` directory
- [ ] Create `ci.yml` workflow file
- [ ] Add `type-check` script to `package.json`
- [ ] Validate YAML syntax
- [ ] Commit and push to feature branch

### Phase 2: Configuration (Day 1)

- [ ] Add GitHub Secrets (Supabase credentials)
- [ ] Test workflow triggers on feature branch
- [ ] Verify code-analysis job runs
- [ ] Verify build job succeeds

### Phase 3: Testing (Day 2)

- [ ] Create test PR to develop
- [ ] Verify workflow runs on PR
- [ ] Check PR comments/annotations
- [ ] Download and inspect artifacts

### Phase 4: Documentation (Day 2)

- [ ] Update project README with CI badge
- [ ] Document workflow in CLAUDE.md
- [ ] Share with team

### Phase 5: Refinement (Week 1)

- [ ] Add ESLint annotations
- [ ] Monitor workflow performance
- [ ] Optimize cache strategy
- [ ] Add status badges

---

## 16. GitHub Actions Badge

Add to README.md:

```markdown
[![CI Pipeline](https://github.com/USERNAME/REPO/actions/workflows/ci.yml/badge.svg)](https://github.com/USERNAME/REPO/actions/workflows/ci.yml)
```

Replace `USERNAME` and `REPO` with actual values.

**Display:**
![CI Pipeline](https://img.shields.io/badge/build-passing-brightgreen)

---

## 17. References

### Official Documentation

- **GitHub Actions:** https://docs.github.com/en/actions
- **Workflow Syntax:** https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions
- **Vite Deployment:** https://vite.dev/guide/static-deploy

### Actions Marketplace

- **Setup Node:** https://github.com/actions/setup-node
- **Checkout:** https://github.com/actions/checkout
- **Upload Artifact:** https://github.com/actions/upload-artifact
- **ESLint Reviewdog:** https://github.com/reviewdog/action-eslint

### Community Resources

- **GitHub Actions Examples:** https://github.com/sdras/awesome-actions
- **Vite + GitHub Actions Template:** https://github.com/pchmn/vite-react-ts-ghactions-template

---

## 18. Conclusion

This GitHub Actions workflow provides:

✅ **Automated Quality Checks** - ESLint, TypeScript validation
✅ **Reliable Builds** - Vite production builds on every push
✅ **Fast Feedback** - Results in <3 minutes
✅ **Developer-Friendly** - Non-blocking analysis, clear error messages
✅ **Cost-Effective** - Well within GitHub's free tier
✅ **Extensible** - Easy to add tests, deployment, security scans

### Next Steps

1. **Implement workflow** following Phase 1-3 checklist
2. **Add tests** and enable test job
3. **Monitor performance** and optimize as needed
4. **Extend workflow** with deployment, releases, security scans

---

**Created by:** Grzegorz Malopolski
**Contact:** grzegorz.malopolski@ringieraxelspringer.pl
**Last Updated:** December 12, 2025
**Version:** 1.0
