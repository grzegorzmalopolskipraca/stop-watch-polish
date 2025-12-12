# 10devs Documentation

This folder contains developer documentation and resources for the "Czy ulica stoi?" traffic monitoring application.

## 📚 Available Documents

### [PRD.md](./PRD.md) ⭐ **START HERE**
**Product Requirements Document - Complete product specification**

Contains:
- **Executive Summary** - Product overview and value proposition
- **Product Purpose** - What the product enables (5 key points)
- **User Problem** - Problem statement with quantified impact
- **Functional Requirements** - 15 high-level requirements (FR-1 to FR-15)
- **Project Boundaries** - In-scope and out-of-scope items (30+ exclusions)
- **User Stories** - 15+ stories organized in 5 epics with acceptance criteria
- **Success Metrics** - Primary KPIs, targets, and success criteria
- **Product Vision** - Vision statement, mission, and positioning
- **Target Users** - 3 detailed personas (Daily Commuter, Delivery Driver, Business Owner)
- **Core Features** - 9 detailed feature descriptions with technical implementation
- **User Journeys** - 4 complete user flows with drop-off analysis
- **Technical Requirements** - Performance, scalability, security, accessibility
- **Future Roadmap** - Q1-Q4 2026 and long-term vision (2027+)

---

### [ARCHITECTURE_AND_TESTING.md](./ARCHITECTURE_AND_TESTING.md)
**Comprehensive guide to project architecture and testing strategy**

Contains:
- **Complete architecture overview** (Frontend, Backend, Database)
- **Component structure** and data flow patterns
- **State management** layers (Server, URL, Local, Client)
- **Supabase Edge Functions** architecture
- **External integrations** (OneSignal, Google Routes API, Weather)
- **Traffic prediction algorithms** (with code examples)
- **Complete testing strategy**:
  - Unit testing (utilities, components, hooks)
  - Integration testing (API, components with React Query)
  - E2E testing (Playwright examples)
- **Test setup and configuration**
- **Migration plan** (phased approach)
- **CI/CD recommendations**

---

### [ARCHITECTURE_DIAGRAMS.md](./ARCHITECTURE_DIAGRAMS.md)
**Visual architecture diagrams in ASCII/markdown format**

Contains:
- **System Overview** - Full stack visualization
- **Data Flow Diagrams** - Traffic report submission, push notifications
- **Traffic Prediction Algorithm** - Step-by-step flow
- **Push Notification Architecture** - End-to-end flow
- **Component Hierarchy** - Complete component tree
- **Database ERD** - Entity relationship diagram
- **State Management Flow** - Decision tree for state placement
- **Testing Architecture** - Testing pyramid and strategy
- **Deployment Architecture** - CI/CD pipeline

---

### [TECHNOLOGY.md](./TECHNOLOGY.md)
**Complete technology stack specification**

Contains:
- **Languages** - TypeScript, JavaScript, SQL, Deno (versions and usage)
- **Frontend Framework** - React 18.3.1, Vite 5.4.19, configuration
- **UI Framework** - shadcn-ui, Radix UI, Tailwind CSS 3.4.17
- **State Management** - React Query 5.83.0, React Router 6.30.1
- **Backend & Database** - Supabase, PostgreSQL 15+, Edge Functions
- **External Integrations** - OneSignal v16, Google Routes API, Weather API
- **Utility Libraries** - date-fns, react-hook-form, zod, recharts, sonner
- **Build Tools** - TypeScript 5.8.3, ESLint, PostCSS, Autoprefixer
- **Testing (Recommended)** - Vitest, React Testing Library, Playwright
- **Deployment** - Lovable platform, Supabase Cloud
- **Version Requirements** - Node 20+, browser compatibility matrix
- **Why These Technologies?** - Decision rationale and trade-offs
- **Technology Decision Matrix** - Comparison of alternatives
- **Performance Optimizations** - Current and recommended improvements
- **Security Considerations** - Current features and recommendations
- **Technology Radar** - Adopt/Trial/Assess/Hold framework

---

### [GITHUBACTIONS-PLAN.md](./GITHUBACTIONS-PLAN.md)
**Complete GitHub Actions CI/CD workflow implementation guide**

Contains:
- **Executive Summary** - Workflow goals and overview
- **Prerequisites** - Project setup and requirements
- **Workflow Triggers** - Push to develop, feature/*, pull requests
- **Jobs Structure** - Code analysis (non-blocking), tests, build
- **Step-by-Step Implementation** - 8 phases with detailed instructions
- **Complete Workflow File** - Production-ready `ci.yml` configuration
- **Testing the Workflow** - Validation and first run guide
- **Troubleshooting** - Common issues and solutions
- **Future Enhancements** - Short/medium/long-term improvements
- **Workflow Optimization** - Performance and cost optimization
- **Monitoring & Metrics** - Key metrics and alerting
- **Security Considerations** - Secrets management, Dependabot
- **Advanced Workflows** - Deployment and release automation
- **Implementation Checklist** - 5-phase implementation plan
- **References** - Official docs and community resources

---

## 🎯 Quick Links by Role

### For Product Managers
1. Read **PRD.md** (complete product specification)
2. Review **Product Purpose** (PRD Section 2.1)
3. Check **Success Metrics** (PRD Section 2.6)
4. Review **User Stories** (PRD Section 2.5)
5. Study **User Journeys** (PRD Section 7)

### For New Developers
1. **Start with PRD.md** - Understand the product first
2. Read **TECHNOLOGY.md** - Learn the complete tech stack
3. Review **Architecture Overview** (ARCHITECTURE_AND_TESTING Section 1-4)
4. Study **Architecture Diagrams** (ARCHITECTURE_DIAGRAMS.md)
5. Understand **Data Flow Patterns** (ARCHITECTURE_AND_TESTING Section 1.2)
6. Review **State Management Layers** (ARCHITECTURE_AND_TESTING Section 1.3)
7. Study **Database Schema** (ARCHITECTURE_AND_TESTING Section 2)
8. Check **Version Requirements** (TECHNOLOGY Section 10)

### For QA Engineers
1. Review **Functional Requirements** (PRD Section 2.3)
2. Study **User Stories & Acceptance Criteria** (PRD Section 2.5)
3. Check **Testing Strategy** (ARCHITECTURE_AND_TESTING Section 5)
4. Read **Testing Pyramid** (ARCHITECTURE_DIAGRAMS Section 8)
5. Review **Unit Testing Guide** (ARCHITECTURE_AND_TESTING Section 6)
6. Review **E2E Testing Examples** (ARCHITECTURE_AND_TESTING Section 8)

### For DevOps Engineers
1. **Read GITHUBACTIONS-PLAN.md** - Complete CI/CD implementation guide
2. Check **Technical Requirements** (PRD Section 9)
3. Read **TECHNOLOGY.md** - Complete tech stack with versions
4. Review **Tech Stack** (ARCHITECTURE_AND_TESTING Section 1 & 2)
5. Study **Deployment Architecture** (ARCHITECTURE_DIAGRAMS Section 9)
6. Review **Edge Functions Architecture** (ARCHITECTURE_AND_TESTING Section 2)
7. Check **Security Considerations** (TECHNOLOGY Section 19)
8. Review **Environment Variables** (TECHNOLOGY Section 14)
9. Read **CI/CD Recommendations** (ARCHITECTURE_AND_TESTING Section 12)
10. Review **Testing Infrastructure** (ARCHITECTURE_AND_TESTING Section 9)
11. Implement **GitHub Actions Workflow** (GITHUBACTIONS-PLAN phases 1-5)

### For Business Stakeholders
1. Read **Executive Summary** (PRD Section 1)
2. Review **Target Users & Personas** (PRD Section 3)
3. Check **Success Metrics** (PRD Section 2.6 and Section 8)
4. Review **Future Roadmap** (PRD Section 10)
5. Study **Coupon System** (PRD Section 6.6)

---

## 🏗️ Architecture Summary

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **State**: React Query + useState + localStorage
- **Push**: OneSignal Web SDK v16
- **Testing**: Vitest + React Testing Library + Playwright

### Key Features
- Real-time traffic reporting (13 streets in Wrocław)
- Traffic predictions using ML-based historical analysis
- Push notifications with tag-based subscriptions
- QR code coupon redemption
- Weather integration
- Real-time chat per street
- User authentication and account management

---

## 🧪 Testing Quick Start

### Current State
⚠️ **No tests exist yet** - this is a greenfield testing opportunity!

### Getting Started with Tests

1. **Install dependencies**:
```bash
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom
npm install -D @playwright/test
```

2. **Create test configuration** (see Section 9.2-9.4 in ARCHITECTURE_AND_TESTING.md)

3. **Start with high-value areas**:
   - `src/utils/trafficCalculations.ts` - Traffic data processing
   - `src/utils/trafficPrediction.ts` - Prediction algorithms
   - `src/components/Legend.tsx` - Simple component
   - `src/components/TrafficLine.tsx` - Complex component with API

4. **Run tests**:
```bash
npm run test          # Unit tests (watch mode)
npm run test:ui       # Vitest UI
npm run test:coverage # Coverage report
npm run test:e2e      # E2E tests
```

### Coverage Goals
- **Utilities**: 90%+
- **Business Logic**: 80%+
- **Components**: 70%+
- **Overall**: 70%+

---

## 📖 Contributing

When adding new documentation:

1. Create markdown files in this folder
2. Update this README with links
3. Follow the existing structure and formatting
4. Include code examples where relevant
5. Keep language clear and concise

---

## 🔗 Related Documentation

### In Main Project
- [CLAUDE.md](../CLAUDE.md) - AI assistant guidance
- [README.md](../README.md) - Project overview
- [package.json](../package.json) - Dependencies and scripts

### External Resources
- [React Testing Library Docs](https://testing-library.com/react)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [OneSignal Web SDK](https://documentation.onesignal.com/docs/web-push-quickstart)

---

## 📝 Document History

| Date | Document | Version | Author |
|------|----------|---------|--------|
| 2025-12-12 | PRD.md | 1.0 | Initial creation - Complete product specification |
| 2025-12-12 | ARCHITECTURE_AND_TESTING.md | 1.0 | Initial creation - Architecture and testing guide |
| 2025-12-12 | ARCHITECTURE_DIAGRAMS.md | 1.0 | Initial creation - Visual architecture diagrams |
| 2025-12-12 | TECHNOLOGY.md | 1.0 | Initial creation - Complete tech stack specification |
| 2025-12-12 | GITHUBACTIONS-PLAN.md | 1.0 | Initial creation - CI/CD workflow implementation guide |
| 2025-12-12 | README.md | 1.0 | Initial creation - Documentation index |

---

## 💡 Tips for Using This Documentation

1. **Start with PRD.md** to understand the product and business context
2. **Read TECHNOLOGY.md** to learn the complete tech stack
3. **Use the table of contents** in each document to jump to sections
4. **Copy-paste code examples** as starting points (tests, GitHub Actions)
5. **Refer to "Common Pitfalls"** and "Troubleshooting" sections when debugging
6. **Follow implementation plans** step-by-step (Testing migration, GitHub Actions)
7. **Use diagrams** in ARCHITECTURE_DIAGRAMS.md for visual understanding

---

## 🤝 Feedback

Have suggestions for improving this documentation?
- Create an issue in the GitHub repository
- Contact: grzegorz.malopolski@ringieraxelspringer.pl
