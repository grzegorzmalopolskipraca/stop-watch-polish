# 10x Test Planner Integration Guide

## Integration Plan for "Czy ulica stoi?" Traffic Monitoring App

**Created:** December 12, 2025
**Tool:** 10x Test Planner by @przeprogramowani
**Repository:** https://github.com/przeprogramowani/10x-test-planner
**Project:** Traffic Monitoring Application

---

## Table of Contents

1. [What is 10x Test Planner?](#1-what-is-10x-test-planner)
2. [Why Use Test Planner?](#2-why-use-test-planner)
3. [Prerequisites](#3-prerequisites)
4. [Installation & Setup](#4-installation--setup)
5. [Workflow Overview](#5-workflow-overview)
6. [Step-by-Step Integration Plan](#6-step-by-step-integration-plan)
7. [Recording User Journeys](#7-recording-user-journeys)
8. [Generating Test Plans](#8-generating-test-plans)
9. [Converting Plans to Tests](#9-converting-plans-to-tests)
10. [Project-Specific Scenarios](#10-project-specific-scenarios)
11. [Best Practices](#11-best-practices)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. What is 10x Test Planner?

### Overview

**10x Test Planner** is a CLI tool that converts **video recordings** of user interactions into **structured test plans** using Google's Gemini AI models.

### What It Does

The tool analyzes video content frame-by-frame and produces:

1. **test-plan.md** - Comprehensive E2E test scenarios
   - Test objectives and groups
   - Step-by-step user workflows
   - Expected outcomes with selectors
   - Preconditions and dependencies

2. **project-checklist.md** - Playwright configuration guidance
   - Setup instructions
   - Environment requirements
   - Configuration recommendations

3. **agent-rules.md** - Instructions for AI test generation
   - Context for AI models (Claude, Gemini)
   - Best practices for test generation
   - Project-specific guidelines

### How It Works

```
Video Recording → Gemini AI Analysis → Structured Test Plans → AI Test Generation → Playwright Tests
```

---

## 2. Why Use Test Planner?

### Benefits for This Project

| Benefit | Description | Impact |
|---------|-------------|--------|
| **Speed** | Generate test plans in minutes vs hours | 10x faster test planning |
| **Consistency** | AI ensures uniform test structure | Better maintainability |
| **Coverage** | AI catches edge cases from video | More comprehensive tests |
| **Documentation** | Visual proof of user flows | Better team communication |
| **AI-Friendly** | Optimized for AI test generation | Seamless Claude/Gemini integration |

### Use Cases for "Czy ulica stoi?"

1. **Traffic Reporting Flow**
   - Record: User selects street → chooses direction → reports "Stoi"
   - Generate: E2E test covering full reporting workflow

2. **Push Notification Subscription**
   - Record: User navigates to /push → subscribes to "Borowska"
   - Generate: Test verifying subscription process

3. **Traffic Prediction Views**
   - Record: User views predictions, timelines, GreenWave
   - Generate: Tests for all prediction components

4. **Coupon Redemption (QR Code)**
   - Record: User scans QR → redeems coupon
   - Generate: Complex test with camera access

5. **Chat & Community Features**
   - Record: User posts chat message, votes, carpooling
   - Generate: Tests for community interactions

---

## 3. Prerequisites

### 3.1 System Requirements

**Node.js Version:**
- Minimum: **Node.js 22+**
- Check: `node --version`
- Install: Use nvm (see `.nvmrc` in test-planner repo)

**Current Project:**
- Node.js: 20.x (in use)
- **Action Required:** Upgrade to Node 22+ for test-planner

**Optional: ffmpeg**
- Only needed for `--optimize` flag
- Install: `brew install ffmpeg` (macOS)

### 3.2 Google API Key

**Required:** Gemini API key (free tier available)

**Steps to Get API Key:**
1. Visit: https://aistudio.google.com/apikey
2. Sign in with Google account
3. Click "Create API Key"
4. Copy the key (starts with `AIza...`)

**Free Tier Limits:**
- Model: `gemini-2.5-flash` (default)
- Requests: Generous free quota
- Video: Size/duration limits (see Google docs)

### 3.3 Screen Recording Tool

**macOS:**
- QuickTime Player (built-in)
- macOS Screenshot tool (Cmd+Shift+5)
- OBS Studio (advanced)

**Windows:**
- Xbox Game Bar (built-in)
- OBS Studio
- Screen Recorder

**Browser Extensions:**
- Loom
- Chrome DevTools Recorder
- Screencastify

---

## 4. Installation & Setup

### 4.1 Install Test Planner

**Option 1: Global Installation**
```bash
npm install -g @10xdevspl/test-planner
```

**Option 2: Use npx (No Installation)**
```bash
# Run directly without installing
npx @10xdevspl/test-planner --video=recording.mov
```

**Verify Installation:**
```bash
test-planner --version
# or
npx @10xdevspl/test-planner --version
```

### 4.2 Configure Environment Variables

**Create `.env.local` file in project root:**
```bash
# .env.local (Git ignored)
GOOGLE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

**Add to `.gitignore`:**
```bash
echo ".env.local" >> .gitignore
```

⚠️ **Security:** Never commit API keys to Git!

### 4.3 Project Structure Setup

**Create directories:**
```bash
mkdir -p recordings        # Store video recordings
mkdir -p e2e               # Generated test plans (default)
mkdir -p tests/e2e         # Actual Playwright tests
```

**Update `.gitignore`:**
```bash
# Video recordings (can be large)
recordings/*.mov
recordings/*.mp4
recordings/*.webm

# Generated test plans (commit these)
# e2e/  (keep test plans in Git)
```

---

## 5. Workflow Overview

### 5-Step Process

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: Record User Journey                               │
│  • Open app in browser                                      │
│  • Start screen recording                                   │
│  • Perform user actions (e.g., report traffic)             │
│  • Stop recording → save as recording.mov                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: Generate Test Plan with AI                        │
│  • Run: npx @10xdevspl/test-planner --video=recording.mov  │
│  • AI analyzes video frame-by-frame                        │
│  • Outputs: test-plan.md, project-checklist.md            │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: Review Generated Test Plan                        │
│  • Read test-plan.md                                       │
│  • Verify scenarios match user actions                     │
│  • Edit/refine if needed                                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 4: Generate Playwright Tests (AI)                    │
│  • Use Claude Code or Gemini                               │
│  • Attach: test-plan.md + agent-rules.md                   │
│  • Prompt: "Generate Playwright tests for this plan"      │
│  • AI creates TypeScript test files                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 5: Run & Refine Tests                                │
│  • Run: npx playwright test                                │
│  • Fix failing tests                                       │
│  • Add to CI/CD pipeline                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Step-by-Step Integration Plan

### Phase 1: Setup (Day 1 - 30 minutes)

**Step 1.1: Upgrade Node.js (if needed)**
```bash
# Check current version
node --version  # Should be 22+

# If using nvm:
nvm install 22
nvm use 22

# Verify
node --version
```

**Step 1.2: Install Test Planner**
```bash
npm install -g @10xdevspl/test-planner
```

**Step 1.3: Get Google API Key**
1. Visit: https://aistudio.google.com/apikey
2. Create API key
3. Copy key

**Step 1.4: Configure Environment**
```bash
# Create .env.local
echo "GOOGLE_API_KEY=YOUR_KEY_HERE" > .env.local

# Add to .gitignore
echo ".env.local" >> .gitignore
```

**Step 1.5: Create Directory Structure**
```bash
mkdir -p recordings e2e tests/e2e
```

---

### Phase 2: First Test Plan (Day 1 - 1 hour)

**Step 2.1: Record User Journey**

**Example: Traffic Reporting Flow**

1. Open app: http://localhost:8080
2. Start screen recording
3. Perform actions:
   - Select "Borowska" from dropdown
   - Click "do centrum" direction
   - Wait for TrafficLine to load
   - Click "Stoi" button
   - Verify success message
4. Stop recording
5. Save as: `recordings/traffic-report-stoi.mov`

**Recording Tips:**
- Keep videos short (1-3 minutes)
- One user journey per video
- Include full page context
- Show all UI interactions clearly
- Avoid rapid mouse movements

**Step 2.2: Generate Test Plan**

```bash
npx @10xdevspl/test-planner \
  --video=recordings/traffic-report-stoi.mov \
  --outDir=./e2e/traffic-reporting
```

**Expected Output:**
```
✓ Video uploaded to Gemini
✓ Analyzing video frames...
✓ Generated test-plan.md
✓ Generated project-checklist.md
✓ Generated agent-rules.md

Files created in: ./e2e/traffic-reporting/
```

**Step 2.3: Review Generated Plan**

```bash
cat e2e/traffic-reporting/test-plan.md
```

**Example Generated Content:**
```markdown
# Test Scenarios: Traffic Reporting

## Scenario 1: Report Traffic as "Stoi"

**Objective**: User successfully reports traffic status

**Preconditions**:
- App is running on http://localhost:8080
- User is on Index page

**Steps**:
1. Click street selector dropdown
2. Select "Borowska" from list
3. Click direction tab "do centrum"
4. Wait for TrafficLine component to load
5. Click "Stoi" button (red)

**Expected Outcomes**:
- Success toast appears: "Zgłoszenie wysłane!"
- TrafficLine updates with new status
- Report visible in timeline

**Test Data**:
- Street: "Borowska"
- Direction: "do centrum"
- Status: "stoi"

**Selectors** (AI-suggested):
- Street dropdown: `[data-testid="street-selector"]`
- Direction tab: `button:has-text("do centrum")`
- Stoi button: `button:has-text("Stoi")`
```

---

### Phase 3: AI Test Generation (Day 2 - 1 hour)

**Step 3.1: Install Playwright**

```bash
npm install -D @playwright/test
npx playwright install
```

**Step 3.2: Configure Playwright**

Create `playwright.config.ts`:
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
  },
});
```

**Step 3.3: Generate Test Code with AI**

**Using Claude Code:**

Prompt:
```
I have a test plan generated from a video recording. Please generate
Playwright tests in TypeScript based on this plan.

Attach files:
- e2e/traffic-reporting/test-plan.md
- e2e/traffic-reporting/agent-rules.md

Requirements:
- Use TypeScript
- Follow Playwright best practices
- Use Page Object Model pattern
- Include proper waits and assertions
- Add data-testid attributes where needed
```

**Expected AI Output:**

```typescript
// tests/e2e/traffic-reporting.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Traffic Reporting', () => {
  test('should allow user to report traffic as Stoi', async ({ page }) => {
    // Navigate to app
    await page.goto('/');

    // Select street
    await page.click('[data-testid="street-selector"]');
    await page.click('text="Borowska"');

    // Select direction
    await page.click('button:has-text("do centrum")');

    // Wait for TrafficLine to load
    await page.waitForSelector('[data-testid="traffic-line"]', {
      state: 'visible'
    });

    // Click Stoi button
    await page.click('button:has-text("Stoi")');

    // Verify success message
    await expect(page.locator('text="Zgłoszenie wysłane!"')).toBeVisible();

    // Verify traffic status updated
    const trafficLine = page.locator('[data-testid="traffic-line"]');
    await expect(trafficLine).toContainText('Stoi');
  });
});
```

**Step 3.4: Add data-testid Attributes**

Based on generated tests, update components:

```tsx
// src/pages/Index.tsx
<Select data-testid="street-selector">
  {/* ... */}
</Select>

<Tabs data-testid="direction-selector">
  {/* ... */}
</Tabs>

<TrafficLine data-testid="traffic-line" />

<Button data-testid="stoi-button" onClick={() => submitReport('stoi')}>
  Stoi
</Button>
```

**Step 3.5: Run Tests**

```bash
# Run all tests
npx playwright test

# Run specific test
npx playwright test traffic-reporting

# Run with UI
npx playwright test --ui

# Debug mode
npx playwright test --debug
```

---

### Phase 4: Expand Test Coverage (Week 1)

**Create Test Plans for All Key Journeys:**

1. **Traffic Reporting** ✅ (Done in Phase 2)
2. **Push Notification Subscription**
3. **Traffic Predictions View**
4. **Coupon Redemption**
5. **Chat Message**
6. **User Authentication**

**Example: Push Notification Subscription**

**Step 4.1: Record Video**
```bash
# Recording name: recordings/push-subscription.mov
# Actions:
# - Navigate to /push
# - Click "Subskrybuj" for Borowska
# - Grant notification permission
# - Verify subscription status
```

**Step 4.2: Generate Plan**
```bash
npx @10xdevspl/test-planner \
  --video=recordings/push-subscription.mov \
  --outDir=./e2e/push-notifications
```

**Step 4.3: Generate Tests (AI)**
```bash
# Use Claude Code with test-plan.md
# Output: tests/e2e/push-notifications.spec.ts
```

**Step 4.4: Run Tests**
```bash
npx playwright test push-notifications
```

---

### Phase 5: CI/CD Integration (Week 2)

**Step 5.1: Add Playwright to GitHub Actions**

Update `.github/workflows/ci.yml`:

```yaml
test:
  name: 🧪 Tests
  runs-on: ubuntu-latest
  if: true  # Enable test job

  steps:
    - name: 📥 Checkout code
      uses: actions/checkout@v4

    - name: 🔧 Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '22'  # Required for test-planner
        cache: 'npm'

    - name: 📦 Install dependencies
      run: npm ci

    - name: 🎭 Install Playwright browsers
      run: npx playwright install --with-deps

    - name: 🧪 Run E2E tests
      run: npx playwright test

    - name: 📊 Upload test results
      if: always()
      uses: actions/upload-artifact@v4
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 30
```

**Step 5.2: Update package.json Scripts**

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:headed": "playwright test --headed"
  }
}
```

---

## 7. Recording User Journeys

### 7.1 What to Record

**Priority 1: Core User Flows**
1. Traffic report submission (all 3 statuses)
2. Street and direction selection
3. Push notification subscription
4. Traffic prediction viewing

**Priority 2: Community Features**
1. Chat message posting
2. Street voting
3. Carpooling coordination

**Priority 3: Advanced Features**
1. Coupon redemption with QR code
2. User authentication (login/signup)
3. Account settings changes

### 7.2 Recording Best Practices

**DO ✅**
- Start with a clean browser state (incognito mode)
- Record entire viewport (not just partial screen)
- Keep recordings 1-3 minutes max
- One user journey per video
- Include successful path (happy path first)
- Show clear UI interactions (clicks, typing)
- Wait for elements to load before clicking

**DON'T ❌**
- Mix multiple user journeys in one video
- Move mouse erratically
- Skip steps or go too fast
- Record with browser extensions visible
- Include sensitive data (use test accounts)
- Record in low resolution

### 7.3 Recording Checklist

Before recording:
- [ ] Clear browser cache
- [ ] Use test account (not production)
- [ ] Disable browser extensions
- [ ] Set viewport to 1920x1080 or 1280x720
- [ ] Plan exact steps before recording
- [ ] Ensure stable network connection

During recording:
- [ ] Speak actions (optional, helps AI)
- [ ] Move mouse deliberately
- [ ] Wait for loading states
- [ ] Show success/error messages clearly

After recording:
- [ ] Review video before generating plan
- [ ] Trim unnecessary parts
- [ ] Name descriptively (e.g., `traffic-report-stoi.mov`)
- [ ] Save in `recordings/` folder

---

## 8. Generating Test Plans

### 8.1 Basic Command

```bash
npx @10xdevspl/test-planner \
  --video=recordings/your-video.mov \
  --outDir=./e2e/feature-name
```

### 8.2 Advanced Options

**Use Different Gemini Model:**
```bash
npx @10xdevspl/test-planner \
  --video=recordings/complex-flow.mov \
  --model=gemini-2.5-pro \
  --outDir=./e2e/complex-feature
```

**Models Available:**
- `gemini-2.5-flash` (default) - Fast, good for simple flows
- `gemini-2.5-pro` - More accurate, better for complex flows

**Optimize Video (Reduce Size):**
```bash
# Requires ffmpeg installed
npx @10xdevspl/test-planner \
  --video=recordings/large-video.mov \
  --optimize \
  --fps=15 \
  --outDir=./e2e/feature
```

**Optimization Benefits:**
- Reduces file size (important for large videos)
- Faster upload to Gemini
- Lower API costs
- Preserves quality for test generation

### 8.3 Output Files

**test-plan.md** - Main test scenarios
```markdown
# Test Scenarios

## Scenario 1: [Title]
**Objective**: ...
**Steps**: ...
**Expected**: ...
```

**project-checklist.md** - Playwright setup guidance
```markdown
# Playwright Setup Checklist
- [ ] Install @playwright/test
- [ ] Configure playwright.config.ts
- [ ] Set baseURL
```

**agent-rules.md** - AI generation guidelines
```markdown
# Agent Rules for Test Generation
- Use Page Object Model
- Add proper waits
- Include accessibility checks
```

---

## 9. Converting Plans to Tests

### 9.1 Using Claude Code

**Prompt Template:**
```
I have a test plan generated from a video recording of user interactions
in our React/TypeScript/Vite application.

Please generate Playwright E2E tests based on this plan.

Context:
- Project: Traffic monitoring app ("Czy ulica stoi?")
- Framework: React 18, TypeScript, Vite
- UI: shadcn-ui, Tailwind CSS
- State: React Query
- Target: E2E tests with Playwright

Requirements:
1. Use TypeScript
2. Follow Page Object Model pattern
3. Use data-testid attributes for selectors
4. Include proper waits (waitForSelector, waitForLoadState)
5. Add meaningful assertions
6. Handle loading states
7. Add comments explaining complex steps

Attached files:
- e2e/[feature]/test-plan.md
- e2e/[feature]/agent-rules.md

Output:
- tests/e2e/[feature].spec.ts
- tests/e2e/pages/[Feature]Page.ts (if using POM)
```

**Example Response:**

```typescript
// tests/e2e/pages/TrafficReportPage.ts
import { Page, Locator } from '@playwright/test';

export class TrafficReportPage {
  readonly page: Page;
  readonly streetSelector: Locator;
  readonly directionToCenter: Locator;
  readonly directionFromCenter: Locator;
  readonly stoiButton: Locator;
  readonly toczyButton: Locator;
  readonly jedzieButton: Locator;
  readonly successToast: Locator;

  constructor(page: Page) {
    this.page = page;
    this.streetSelector = page.locator('[data-testid="street-selector"]');
    this.directionToCenter = page.locator('button:has-text("do centrum")');
    this.directionFromCenter = page.locator('button:has-text("od centrum")');
    this.stoiButton = page.locator('[data-testid="stoi-button"]');
    this.toczyButton = page.locator('[data-testid="toczy-button"]');
    this.jedzieButton = page.locator('[data-testid="jedzie-button"]');
    this.successToast = page.locator('text="Zgłoszenie wysłane!"');
  }

  async goto() {
    await this.page.goto('/');
  }

  async selectStreet(streetName: string) {
    await this.streetSelector.click();
    await this.page.click(`text="${streetName}"`);
  }

  async selectDirection(direction: 'do centrum' | 'od centrum') {
    if (direction === 'do centrum') {
      await this.directionToCenter.click();
    } else {
      await this.directionFromCenter.click();
    }
  }

  async reportStatus(status: 'stoi' | 'toczy' | 'jedzie') {
    const buttonMap = {
      stoi: this.stoiButton,
      toczy: this.toczyButton,
      jedzie: this.jedzieButton
    };
    await buttonMap[status].click();
  }

  async waitForSuccessMessage() {
    await this.successToast.waitFor({ state: 'visible' });
  }
}

// tests/e2e/traffic-reporting.spec.ts
import { test, expect } from '@playwright/test';
import { TrafficReportPage } from './pages/TrafficReportPage';

test.describe('Traffic Reporting', () => {
  let reportPage: TrafficReportPage;

  test.beforeEach(async ({ page }) => {
    reportPage = new TrafficReportPage(page);
    await reportPage.goto();
  });

  test('should report traffic as Stoi', async ({ page }) => {
    await reportPage.selectStreet('Borowska');
    await reportPage.selectDirection('do centrum');
    await reportPage.reportStatus('stoi');
    await reportPage.waitForSuccessMessage();

    // Additional assertions
    await expect(page.locator('[data-testid="traffic-line"]')).toBeVisible();
  });

  test('should report traffic as Jedzie', async ({ page }) => {
    await reportPage.selectStreet('Grabiszyńska');
    await reportPage.selectDirection('od centrum');
    await reportPage.reportStatus('jedzie');
    await reportPage.waitForSuccessMessage();
  });
});
```

### 9.2 Refining Generated Tests

**Common Adjustments:**

1. **Add data-testid attributes** to components
2. **Handle async operations** (React Query, API calls)
3. **Mock external services** (Supabase, OneSignal)
4. **Add test data factories**
5. **Configure test database** (Supabase local instance)

---

## 10. Project-Specific Scenarios

### 10.1 Scenario Template: Traffic Reporting

**Video Recording:**
- Filename: `recordings/traffic-report-{status}.mov`
- Duration: ~1 minute
- Actions: Select street → direction → status button

**Generated Test Plan Location:**
- `e2e/traffic-reporting/test-plan.md`

**Playwright Test:**
- `tests/e2e/traffic-reporting.spec.ts`

**Key Test Cases:**
1. Report "Stoi" status
2. Report "Toczy się" status
3. Report "Jedzie" status
4. Verify speed data inclusion
5. Verify success message
6. Verify TrafficLine update

---

### 10.2 Scenario Template: Push Notifications

**Video Recording:**
- Filename: `recordings/push-subscription-{street}.mov`
- Duration: ~1-2 minutes
- Actions: Navigate /push → subscribe → grant permission

**Special Considerations:**
- **Browser permissions** - Need to grant notifications
- **Service worker** - Must be registered
- **OneSignal SDK** - Must be initialized

**Playwright Configuration:**
```typescript
// playwright.config.ts
use: {
  permissions: ['notifications'],
  // Grant notification permission by default
}
```

**Generated Test:**
```typescript
test('should subscribe to push notifications', async ({ page, context }) => {
  // Grant permissions
  await context.grantPermissions(['notifications']);

  await page.goto('/push');

  // Click subscribe button for Borowska
  await page.click('[data-testid="subscribe-borowska"]');

  // Wait for OneSignal to register
  await page.waitForTimeout(2000);

  // Verify subscription status
  await expect(page.locator('text="Subskrybujesz"')).toBeVisible();
});
```

---

### 10.3 Scenario Template: Coupon Redemption

**Video Recording:**
- Filename: `recordings/coupon-redemption.mov`
- Duration: ~2-3 minutes
- Actions: Navigate /kupon?id=X → scan QR → verify redemption

**Special Considerations:**
- **Camera access** - Need to grant camera permission
- **QR code mock** - Mock camera stream with test QR
- **Complex flow** - Multiple steps with async operations

**Mock Camera Stream:**
```typescript
// tests/e2e/helpers/mockCamera.ts
export async function mockCameraWithQRCode(page: Page, qrData: string) {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      // Return mock video stream with QR code
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      // Draw QR code on canvas
      // Return canvas.captureStream()
    };
  });
}
```

---

## 11. Best Practices

### 11.1 Test Organization

**Directory Structure:**
```
recordings/
├── traffic-reporting/
│   ├── report-stoi.mov
│   ├── report-toczy.mov
│   └── report-jedzie.mov
├── push-notifications/
│   ├── subscribe-flow.mov
│   └── unsubscribe-flow.mov
└── coupons/
    └── redeem-qr.mov

e2e/
├── traffic-reporting/
│   ├── test-plan.md
│   ├── project-checklist.md
│   └── agent-rules.md
├── push-notifications/
│   └── ...
└── coupons/
    └── ...

tests/e2e/
├── traffic-reporting.spec.ts
├── push-notifications.spec.ts
├── coupons.spec.ts
└── pages/
    ├── TrafficReportPage.ts
    ├── PushPage.ts
    └── CouponPage.ts
```

### 11.2 Naming Conventions

**Video Files:**
- Pattern: `{feature}-{action}-{variant}.mov`
- Examples:
  - `traffic-report-stoi.mov`
  - `push-subscribe-borowska.mov`
  - `coupon-redeem-success.mov`

**Test Files:**
- Pattern: `{feature}.spec.ts`
- Examples:
  - `traffic-reporting.spec.ts`
  - `push-notifications.spec.ts`

**Page Objects:**
- Pattern: `{Feature}Page.ts`
- Examples:
  - `TrafficReportPage.ts`
  - `PushPage.ts`

### 11.3 Test Data Management

**Use Test Fixtures:**
```typescript
// tests/e2e/fixtures/streets.ts
export const TEST_STREETS = [
  'Borowska',
  'Grabiszyńska',
  'Opolska'
] as const;

export const TEST_DIRECTIONS = [
  'do centrum',
  'od centrum'
] as const;

export const TEST_STATUSES = [
  'stoi',
  'toczy_sie',
  'jedzie'
] as const;
```

**Use in Tests:**
```typescript
import { TEST_STREETS, TEST_STATUSES } from './fixtures/streets';

test('should accept all valid street names', async () => {
  for (const street of TEST_STREETS) {
    await reportPage.selectStreet(street);
    // assertions
  }
});
```

---

## 12. Troubleshooting

### 12.1 Common Issues

#### Issue 1: Node.js Version Too Old

**Error:**
```
Error: Requires Node.js 22+
```

**Solution:**
```bash
nvm install 22
nvm use 22
node --version  # Verify
```

---

#### Issue 2: Google API Key Not Found

**Error:**
```
Error: GOOGLE_API_KEY environment variable not set
```

**Solution:**
```bash
# Check .env.local exists
cat .env.local

# Verify key is set
echo $GOOGLE_API_KEY

# If empty, export manually
export GOOGLE_API_KEY=AIzaSy...
```

---

#### Issue 3: Video Too Large

**Error:**
```
Error: Video exceeds Gemini API size limit
```

**Solution:**
```bash
# Option 1: Use --optimize flag
npx @10xdevspl/test-planner \
  --video=large.mov \
  --optimize \
  --fps=10

# Option 2: Compress manually with ffmpeg
ffmpeg -i large.mov -vf fps=10 -s 1280x720 small.mov
```

---

#### Issue 4: Playwright Tests Failing

**Error:**
```
Error: Timeout waiting for selector
```

**Solutions:**

1. **Increase timeout:**
```typescript
await page.waitForSelector('[data-testid="element"]', {
  timeout: 10000  // 10 seconds
});
```

2. **Add data-testid attributes:**
```tsx
<Button data-testid="stoi-button">Stoi</Button>
```

3. **Wait for network idle:**
```typescript
await page.waitForLoadState('networkidle');
```

4. **Debug with headed mode:**
```bash
npx playwright test --headed --debug
```

---

#### Issue 5: OneSignal Not Initialized in Tests

**Error:**
```
Error: OneSignal is not defined
```

**Solution:**
```typescript
// Mock OneSignal in test setup
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.OneSignal = {
      init: () => Promise.resolve(),
      User: {
        addTag: () => Promise.resolve(),
        removeTag: () => Promise.resolve()
      }
    };
  });
});
```

---

## 13. Integration Checklist

### Pre-Integration

- [ ] Node.js 22+ installed
- [ ] Google API key obtained
- [ ] `.env.local` configured
- [ ] ffmpeg installed (optional)
- [ ] Screen recording tool available

### Installation

- [ ] Test planner installed globally or npx available
- [ ] Playwright installed (`npm install -D @playwright/test`)
- [ ] Playwright browsers installed (`npx playwright install`)
- [ ] Directory structure created (`recordings/`, `e2e/`, `tests/e2e/`)

### First Test Plan

- [ ] User journey recorded (1-3 min video)
- [ ] Test plan generated successfully
- [ ] `test-plan.md` reviewed and validated
- [ ] AI-generated Playwright test created
- [ ] `data-testid` attributes added to components
- [ ] Test runs successfully locally

### CI/CD Integration

- [ ] GitHub Actions workflow updated
- [ ] Node.js 22 configured in CI
- [ ] Playwright install step added
- [ ] E2E tests running in CI
- [ ] Test reports uploaded as artifacts

### Documentation

- [ ] Test planner usage documented
- [ ] Recording guidelines shared with team
- [ ] CI/CD integration documented
- [ ] Troubleshooting guide created

---

## 14. Advanced Usage

### 14.1 Batch Processing Multiple Videos

```bash
#!/bin/bash
# generate-all-plans.sh

for video in recordings/*.mov; do
  basename=$(basename "$video" .mov)
  echo "Processing: $basename"

  npx @10xdevspl/test-planner \
    --video="$video" \
    --outDir="./e2e/$basename"
done
```

### 14.2 Custom Agent Rules

Create project-specific `agent-rules-custom.md`:

```markdown
# Custom Agent Rules for "Czy ulica stoi?"

## Project Context
- React 18 + TypeScript + Vite
- shadcn-ui components
- React Query for state
- Supabase backend

## Component Patterns

### Street Selector
Always use:
```typescript
await page.click('[data-testid="street-selector"]');
await page.click('text="Borowska"');
```

### Direction Tabs
Always use:
```typescript
await page.click('button:has-text("do centrum")');
```

### Status Buttons
Always use data-testid:
```typescript
await page.click('[data-testid="stoi-button"]');
```

## Wait Strategies

### React Query Loading
```typescript
await page.waitForSelector('[data-testid="traffic-line"]');
await page.waitForFunction(() => {
  return !document.querySelector('[data-loading="true"]');
});
```

### OneSignal Initialization
```typescript
await page.waitForTimeout(2000); // OneSignal init
```

## Common Selectors

| Element | Selector |
|---------|----------|
| Street dropdown | `[data-testid="street-selector"]` |
| Direction tabs | `button:has-text("do centrum")` |
| Status buttons | `[data-testid="{status}-button"]` |
| Success toast | `text="Zgłoszenie wysłane!"` |
| TrafficLine | `[data-testid="traffic-line"]` |
```

Attach this file when generating tests for better consistency.

---

## 15. Metrics & KPIs

### Track These Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Video to Test Time** | <15 min | Time from recording to running test |
| **Test Pass Rate** | >95% | Playwright test results |
| **Coverage** | 70%+ | E2E coverage of user journeys |
| **Test Maintenance** | <10% effort | Time spent fixing flaky tests |
| **AI Accuracy** | >90% | Generated tests that run without edits |

### Success Criteria

The integration is successful when:
- ✅ 5+ user journeys have generated test plans
- ✅ Playwright tests run in CI/CD
- ✅ Test pass rate >90%
- ✅ Team uses test planner regularly (1+ video/week)
- ✅ AI-generated tests require minimal edits

---

## 16. Resources

### Official Documentation

- **10x Test Planner**: https://github.com/przeprogramowani/10x-test-planner
- **Playwright**: https://playwright.dev
- **Gemini API**: https://ai.google.dev/gemini-api/docs

### Related Documentation

- **Testing Strategy**: See `ARCHITECTURE_AND_TESTING.md` (Section 6-8)
- **CI/CD Workflow**: See `GITHUBACTIONS-PLAN.md`
- **Tech Stack**: See `TECHNOLOGY.md`

### Community

- **10xdevs Course**: https://www.10xdevs.pl/
- **Playwright Discord**: https://discord.gg/playwright

---

## Conclusion

The **10x Test Planner** provides a revolutionary approach to E2E test creation:

1. ✅ **Record** user interactions (1-3 min video)
2. ✅ **Generate** AI-powered test plans (Gemini)
3. ✅ **Convert** to Playwright tests (Claude/Gemini)
4. ✅ **Run** in CI/CD pipeline
5. ✅ **Maintain** with ease

### Next Steps

1. **Install** test planner and Playwright
2. **Record** first user journey (traffic reporting)
3. **Generate** test plan with AI
4. **Create** Playwright test with Claude Code
5. **Integrate** into CI/CD workflow

**Time to First Working Test:** ~2 hours

**Long-term Benefit:** 10x faster E2E test development

---

**Created by:** Grzegorz Malopolski
**Contact:** grzegorz.malopolski@ringieraxelspringer.pl
**Last Updated:** December 12, 2025
**Version:** 1.0
