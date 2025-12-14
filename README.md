# Czy ulica stoi? - Traffic Monitoring App

[![CI Pipeline](https://github.com/USERNAME/stop-watch-polish/actions/workflows/ci.yml/badge.svg)](https://github.com/USERNAME/stop-watch-polish/actions/workflows/ci.yml)

**Polish traffic monitoring web application** for Wrocław - Real-time traffic reports, predictions, and community features.

## Project info

**URL**: https://lovable.dev/projects/7e6d938d-cb5d-485a-93c6-06ffdfa54334
**Owner**: Grzegorz Malopolski (grzegorz.malopolski@ringieraxelspringer.pl)

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/7e6d938d-cb5d-485a-93c6-06ffdfa54334) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- **Frontend**: Vite 5.4.19, TypeScript 5.8.3, React 18.3.1
- **UI**: shadcn-ui, Radix UI, Tailwind CSS 3.4.17
- **State**: React Query 5.83.0, React Router 6.30.1
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Notifications**: OneSignal Web SDK v16
- **Testing**: Vitest (recommended, not yet implemented)

📚 **Full tech stack documentation**: See [`10devs/TECHNOLOGY.md`](./10devs/TECHNOLOGY.md)

---

## 🔧 CI/CD Pipeline

This project uses **GitHub Actions** for continuous integration and deployment.

### Workflow Overview

The CI pipeline runs on every push to `develop` and `feature/**` branches, as well as on pull requests:

- **📊 Code Analysis** (non-blocking) - ESLint and TypeScript checks
- **🧪 Tests** (blocking) - Unit and integration tests (when implemented)
- **🏗️ Build** (blocking) - Vite production build with artifact upload

### Available Scripts

```bash
npm run lint          # Run ESLint
npm run type-check    # TypeScript validation
npm run build         # Production build
npm run test          # Run tests (watch mode)
npm run test:ci       # Run tests (CI mode)
```

### GitHub Actions Setup

The workflow is defined in `.github/workflows/ci.yml` and requires the following GitHub Secrets:

- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key

📋 **Complete CI/CD implementation guide**: See [`10devs/GITHUBACTIONS-PLAN.md`](./10devs/GITHUBACTIONS-PLAN.md)

---

## 🤖 MCP Servers

This project uses **Model Context Protocol (MCP) servers** to enhance AI-assisted development with Claude Code.

### What are MCP Servers?

MCP servers extend Claude's capabilities by providing access to external tools, data sources, and specialized knowledge. They enable Claude to:
- Access up-to-date documentation
- Follow project-specific coding standards
- Integrate with external APIs and services
- Provide context-aware assistance

### Installed MCP Servers

#### 1. **10x Rules** 🎯
- **Purpose:** Provides coding best practices and rules from the 10xdevs course
- **Auto-invokes:** When working with code patterns, architecture decisions, or best practices
- **Source:** https://10x-rules-mcp-server.przeprogramowani.workers.dev/sse

#### 2. **Context7** 📚
- **Purpose:** Fetches up-to-date, version-specific documentation from official sources
- **Auto-invokes:** When you need current API docs, library documentation, or code examples
- **Developer:** Upstash
- **Repository:** https://github.com/upstash/context7

### Configuration

MCP servers are configured in `.mcp.json`:

```json
{
  "mcpServers": {
    "10x-rules": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://10x-rules-mcp-server.przeprogramowani.workers.dev/sse"
      ]
    },
    "context7": {
      "command": "npx",
      "args": [
        "-y",
        "@upstash/context7-mcp@latest"
      ]
    }
  }
}
```

MCP servers are enabled in `.claude/settings.local.json`:

```json
{
  "enableAllProjectMcpServers": true
}
```

### How to Use

MCP servers work automatically - Claude invokes them when relevant to your task.

**Explicit usage:**
```
"Use context7 to get the latest React 18 documentation"
"Apply 10x-rules for this component architecture"
```

**Automatic usage:**
```
"Create a new Next.js component"
  → Context7 automatically fetches Next.js docs

"Should I use useState or useReducer here?"
  → 10x-rules provides best practices guidance
```

### Requirements

- **Node.js:** v18.0.0 or higher
- **Claude Code:** Latest version with MCP support
- **Internet connection:** Required for remote MCP servers

### Benefits

- ✅ **Always current:** Documentation is fetched in real-time, never outdated
- ✅ **Context-aware:** Servers understand your project structure and needs
- ✅ **Best practices:** Built-in coding standards and patterns
- ✅ **Faster development:** Less context switching to documentation sites
- ✅ **Fewer errors:** Accurate, version-specific code examples

### Adding More MCP Servers

To add additional MCP servers, update `.mcp.json`:

```json
{
  "mcpServers": {
    "10x-rules": { /* ... */ },
    "context7": { /* ... */ },
    "your-new-server": {
      "command": "npx",
      "args": ["-y", "your-mcp-package@latest"]
    }
  }
}
```

**Popular MCP servers:**
- **Filesystem:** Access and modify local files
- **GitHub:** Interact with GitHub repositories
- **Brave Search:** Web search capabilities
- **PostgreSQL:** Direct database queries
- **Slack:** Team communication integration

**Explore more:** https://github.com/modelcontextprotocol/servers

---

## 📚 Comprehensive Documentation

This project includes extensive documentation in the **`10devs/`** folder:

| Document | Description |
|----------|-------------|
| **[PRD.md](./10devs/PRD.md)** | Product Requirements Document - Complete product specification |
| **[ARCHITECTURE_AND_TESTING.md](./10devs/ARCHITECTURE_AND_TESTING.md)** | Technical architecture and testing strategy |
| **[ARCHITECTURE_DIAGRAMS.md](./10devs/ARCHITECTURE_DIAGRAMS.md)** | Visual architecture diagrams (ASCII) |
| **[TECHNOLOGY.md](./10devs/TECHNOLOGY.md)** | Complete technology stack specification |
| **[GITHUBACTIONS-PLAN.md](./10devs/GITHUBACTIONS-PLAN.md)** | GitHub Actions CI/CD workflow guide |
| **[README.md](./10devs/README.md)** | Documentation index with quick links by role |

**Quick starts by role:**
- **Product Managers**: Start with [PRD.md](./10devs/PRD.md)
- **Developers**: Read [TECHNOLOGY.md](./10devs/TECHNOLOGY.md) and [ARCHITECTURE_AND_TESTING.md](./10devs/ARCHITECTURE_AND_TESTING.md)
- **DevOps**: See [GITHUBACTIONS-PLAN.md](./10devs/GITHUBACTIONS-PLAN.md)
- **QA Engineers**: Review testing strategy in [ARCHITECTURE_AND_TESTING.md](./10devs/ARCHITECTURE_AND_TESTING.md)

📖 **Additional project documentation**: See [`CLAUDE.md`](./CLAUDE.md) for AI assistant guidance

---

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/7e6d938d-cb5d-485a-93c6-06ffdfa54334) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

---

## 📖 Learning Project

This project was created as part of the **[10xdevs 2.0](https://www.10xdevs.pl/)** course.

**Course Information:**
- **Course Name:** 10xdevs 2.0
- **Developer:** Grzegorz Malopolski
- **Website:** https://www.10xdevs.pl/
- **Main Goal:** Learn how to work better with AI in software development

The course focuses on leveraging AI tools and techniques to enhance productivity, code quality, and development workflows. This project demonstrates practical application of AI-assisted development, including:

- AI-powered code generation and refactoring
- Automated documentation creation
- Architecture planning with AI assistance
- CI/CD workflow design
- Test strategy development

All documentation in the `10devs/` folder was created with AI collaboration, showcasing how developers can effectively work with AI tools like Claude Code to build comprehensive project documentation and implement best practices.

**Learn more about the course:** https://www.10xdevs.pl/
