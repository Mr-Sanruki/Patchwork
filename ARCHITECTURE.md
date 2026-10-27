# Patchwork Architecture

## System Overview

Patchwork is a **multi-agent autonomous dependency upgrade engine** built with TypeScript. It orchestrates three tiers of NVIDIA Nemotron AI models through Nebius Token Factory, grounded by live documentation retrieval via Tavily, to automatically fix breaking dependency upgrades and produce verified pull requests.

## Core Principles

1. **Multi-agent tier routing**: Fast models for classification, powerful models for code generation, reasoning models for review
2. **Sandbox isolation**: Untrusted code never runs outside a container
3. **Human-in-the-loop**: AI proposes, human approves — nothing auto-merges
4. **Reproducible verification**: Every candidate patch is tested in its own isolated workspace

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Frontend                            │
│  ┌──────────┐ ┌──────────────┐ ┌────────────┐ ┌──────────────┐  │
│  │ HomePage │ │ LiveJobPage  │ │ Benchmarks │ │ DiffViewer   │  │
│  └──────────┘ └──────────────┘ └────────────┘ └──────────────┘  │
│       │              │ SSE            │              │            │
├───────┴──────────────┴────────────────┴──────────────┴───────────┤
│                     Vite Dev Proxy (/api)                         │
├──────────────────────────────────────────────────────────────────┤
│                      Fastify Backend                              │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                   REST API Layer                             │ │
│  │  POST /api/jobs  GET /api/jobs/:id  GET /api/jobs/:id/events│ │
│  │  POST /api/jobs/:id/approve  GET /api/models  GET /api/health│ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │               Pipeline Orchestrator                          │ │
│  │  Clone → Baseline → Break → Research → Triage → Candidates  │ │
│  │  → Test → Repair Loop → Select → Review → Deliver           │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────┐ ┌─────────────┐ ┌──────────────┐ ┌──────────┐ │
│  │ Token       │ │ Tavily      │ │ Sandbox      │ │ SSE      │ │
│  │ Factory     │ │ Client      │ │ Runner       │ │ Manager  │ │
│  │ Client      │ │             │ │ (Docker/     │ │          │ │
│  │ (3 tiers)   │ │ (Search +   │ │  Nebius Jobs)│ │          │ │
│  │             │ │  Extract)   │ │              │ │          │ │
│  └──────┬──────┘ └──────┬──────┘ └──────┬───────┘ └──────────┘ │
│         │               │               │                        │
│  ┌──────┴───────────────┴───────────────┴───────────────────────┐│
│  │                    SQLite Repository                          ││
│  │  Jobs │ Candidates │ Sources │ Logs │ Benchmarks             ││
│  └──────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────┘
         │               │               │
    Nebius Token     Tavily API      Docker / Nebius
    Factory API                      Serverless Jobs
```

## Data Flow

### Pipeline Steps

| Step | Agent | Model Tier | Input | Output |
|------|-------|-----------|-------|--------|
| 1. Clone & Baseline | System | — | Repo URL | Green test suite confirmation |
| 2. Upgrade & Break | System | — | Package bump | Failure logs |
| 3. Research | Tavily | — | Package + version | Migration docs, sources |
| 4. Triage | Nemotron Nano | Tier 1 | Failures + docs | Structured JSON: affected files, risk |
| 5. Candidates | Nemotron Super | Tier 2 | Code + triage + docs | 4 unified diffs (parallel) |
| 6. Test | Sandbox | — | Diff + repo copy | Pass/fail per candidate |
| 7. Repair | Nemotron Super | Tier 2 | Failure logs | Revised diffs |
| 8. Select | System | — | Passing candidates | Winner (smallest diff) |
| 9. Review | Nemotron Ultra | Tier 3 | Winning diff | PR title, body, risk note |
| 10. Deliver | GitHub API | — | PR content | Pull request or .patch file |

### SSE Event Types

All steps emit structured events to the frontend via Server-Sent Events:

- `job:status` — Pipeline stage transitions
- `job:log` — Execution log messages
- `candidate:created` — New candidate patch generated
- `candidate:update` — Test results for a candidate
- `tavily:source` — New documentation source found
- `job:completed` — Pipeline finished successfully
- `job:failed` — Pipeline encountered a fatal error

## Technology Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Backend | Node.js 20 + Fastify | Lightweight, native ESM, fast |
| Frontend | React + Vite + Tailwind | Modern DX, instant HMR |
| Database | SQLite (better-sqlite3) | Zero-config, single-file persistence |
| AI Models | NVIDIA Nemotron via Nebius Token Factory | OpenAI-compatible, cost-efficient tiers |
| Search | Tavily Search & Extract | Real-time documentation grounding |
| Sandbox | Docker / Nebius Serverless Jobs | Isolated test execution |
| GitHub | Octokit REST API | PR creation with fallback .patch mode |
| Validation | Zod | Runtime type safety for env and payloads |
| Testing | Vitest | Fast, native TypeScript support |
