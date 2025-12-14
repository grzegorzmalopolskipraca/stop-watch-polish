# MCP Servers Reference

## Overview

This project uses **2 MCP servers** to enhance Claude Code's capabilities with real-time documentation and best practices.

## Installed MCP Servers

### 1. 10x Rules (Best Practices)

**Purpose:** Provides coding rules and best practices from the 10xdevs 2.0 course.

**When to use:**
- Architectural decisions
- Code patterns and conventions
- Best practices questions
- Quality standards

**Example prompts:**
```
"What's the best practice for state management in React according to 10x-rules?"
"Should I use context or prop drilling here? Check 10x-rules"
"Review this component architecture using 10x-rules"
```

**Configuration:**
```json
{
  "10x-rules": {
    "command": "npx",
    "args": [
      "mcp-remote",
      "https://10x-rules-mcp-server.przeprogramowani.workers.dev/sse"
    ]
  }
}
```

### 2. Context7 (Up-to-date Documentation)

**Purpose:** Fetches current, version-specific documentation from official sources.

**When to use:**
- Learning new APIs
- Getting latest framework documentation
- Finding working code examples
- Checking for deprecated methods

**Example prompts:**
```
"Use context7 to show React 18.3.1 useEffect best practices"
"Get latest Supabase Edge Functions documentation with context7"
"Use context7 for Tailwind CSS 3.4.17 responsive design patterns"
```

**Automatic activation:**
Context7 automatically activates when you're working with:
- Framework-specific code (React, Next.js, Vite)
- Library APIs (Supabase, React Query, OneSignal)
- UI frameworks (Tailwind CSS, Radix UI)

**Configuration:**
```json
{
  "context7": {
    "command": "npx",
    "args": ["-y", "@upstash/context7-mcp@latest"]
  }
}
```

## Combined Usage

You can use both MCP servers together for maximum effectiveness:

```
"Create a new timeline component for traffic predictions.
Use context7 for React Query 5.83.0 patterns.
Apply 10x-rules for component structure."
```

This will:
1. Context7 fetches latest React Query docs
2. 10x-rules applies project-specific patterns
3. You get a component that follows both current best practices AND project conventions

## Project-Specific Use Cases

### Use Case 1: Creating Edge Function

```
"Create a new Supabase Edge Function for weather data.
Use context7 for Deno runtime and Supabase 2.76.1 APIs.
Follow 10x-rules for error handling patterns."
```

**Result:**
- Context7 provides current Supabase Edge Function syntax
- 10x-rules ensures CORS, validation, and error handling patterns
- You get production-ready code

### Use Case 2: Building Traffic Component

```
"Build a component showing weekly traffic patterns.
Use context7 for React Query caching strategies.
Apply 10x-rules for the prediction logic pattern."
```

**Result:**
- Context7 shows latest React Query 5.83.0 patterns
- 10x-rules ensures 4-week data fetch, day-of-week filtering
- Component follows project standards

### Use Case 3: Debugging OneSignal

```
"OneSignal notifications aren't working.
Use context7 for OneSignal Web SDK v16 troubleshooting.
Check 10x-rules for tag format requirements."
```

**Result:**
- Context7 provides current OneSignal API docs
- 10x-rules reminds about `street_<name>` tag format
- Fast resolution with correct solution

## Best Practices

### When to Use Context7

✅ **Use when:**
- Working with external libraries/frameworks
- Need current API documentation
- Looking for working code examples
- Checking version-specific features

❌ **Don't use when:**
- You already know the API well
- Working on project-specific logic
- Simple refactoring tasks

### When to Use 10x-Rules

✅ **Use when:**
- Making architectural decisions
- Need project-specific patterns
- Want to follow team conventions
- Reviewing code quality

❌ **Don't use when:**
- Prototyping/experimenting
- One-off scripts outside project
- Learning new concepts (use Context7)

## Troubleshooting

### MCP Server Not Loading

**Check configuration:**
```bash
cat .mcp.json
```

**Verify enabled in settings:**
```bash
cat .claude/settings.local.json | grep enableAllProjectMcpServers
```

Should show: `"enableAllProjectMcpServers": true`

**Restart Claude Code:**
After changing `.mcp.json`, restart Claude Code for changes to take effect.

### Context7 Not Fetching Docs

**Verify internet connection:**
Context7 requires internet to fetch documentation.

**Check Node.js version:**
```bash
node --version  # Should be >= v18.0.0
```

**Test npx access:**
```bash
npx -y @upstash/context7-mcp@latest --version
```

### 10x-Rules Not Responding

**Test remote connection:**
```bash
curl https://10x-rules-mcp-server.przeprogramowani.workers.dev/sse
```

**Check firewall:**
Ensure your firewall allows connections to `przeprogramowani.workers.dev`

## Performance Considerations

### Context7 Performance

- **First call:** ~2-3 seconds (fetches documentation)
- **Cached:** ~0.5 seconds (uses cached docs)
- **Token usage:** ~100-500 tokens per doc fetch

**Optimization:**
- Be specific about what you need
- Request only relevant sections
- Reuse fetched docs in same conversation

### 10x-Rules Performance

- **Response time:** ~1-2 seconds
- **Token usage:** ~50-200 tokens per query

**Optimization:**
- One question at a time
- Be specific about the rule/pattern you need

## Advanced Usage

### Conditional MCP Usage

```
"If using React Query for this data fetch is the best practice
according to 10x-rules, implement it using context7 for the latest API."
```

This creates a decision flow:
1. 10x-rules evaluates if React Query is appropriate
2. If yes, Context7 provides current implementation
3. If no, 10x-rules suggests alternative

### Multi-Framework Queries

```
"Compare Supabase vs Firebase for our traffic monitoring needs.
Use context7 for current features of both.
Apply 10x-rules decision matrix for selection."
```

Gets you:
- Current capabilities from both (Context7)
- Decision framework from course (10x-rules)
- Well-reasoned recommendation

## Integration with Project Tools

### MCP + Agents

```
Developer agent + Context7
  = Implementation with current docs

Architect agent + 10x-rules
  = Decisions following best practices

Reviewer agent + Both
  = Code review with standards + current APIs
```

### MCP + Skills

```
creating-timeline-component skill + Context7
  = Timeline using latest React Query patterns

creating-edge-function skill + 10x-rules
  = Edge Function following project standards
```

### MCP + Commands

```
/new-component + Context7 + 10x-rules
  = Component with current APIs and project patterns
```

## Future MCP Servers

Consider adding:

**For this project:**
- **Supabase MCP:** Direct database access
- **GitHub MCP:** Repository operations
- **OneSignal MCP:** Push notification management

**General development:**
- **PostgreSQL MCP:** Database queries
- **Filesystem MCP:** File operations
- **Brave Search MCP:** Web research

## Summary

| MCP Server | Purpose | When to Use | Response Time |
|------------|---------|-------------|---------------|
| **10x-rules** | Best practices from course | Architectural decisions, patterns | 1-2s |
| **Context7** | Current documentation | API usage, framework docs | 2-3s (first), 0.5s (cached) |

Both servers work automatically when relevant, or you can invoke them explicitly for maximum control.

**Pro tip:** Start prompts with "Using context7 and 10x-rules..." to ensure both activate for comprehensive assistance.

---

**Last Updated:** December 12, 2025
**MCP Servers:** 2 active
**Configuration:** `.mcp.json`
