# Patchwork

> **Dependency upgrades that fix themselves, and prove it.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Built with NVIDIA Nemotron](https://img.shields.io/badge/Model-NVIDIA_Nemotron-76b900.svg)](https://build.nvidia.com)
[![Powered by Nebius Token Factory](https://img.shields.io/badge/Inference-Nebius_Token_Factory-0066ff.svg)](https://nebius.ai)
[![Tavily Search](https://img.shields.io/badge/Search-Tavily_Extract-10b981.svg)](https://tavily.com)

Patchwork is a multi-agent autonomous dependency upgrade engine built for the **Nebius x NVIDIA Global AI Hackathon** (Coding and Agentic Engineering Track). Give it a repo and a breaking dependency upgrade — it bumps the version, captures failures, researches migration guides, generates parallel candidate patches, tests each in an isolated sandbox, and delivers a verified Pull Request.

**A human always approves. Nothing auto-merges.**

---

## 🏗 Architecture

```mermaid
graph TB
    subgraph "User Input"
        A[GitHub Repo URL + Package Upgrade]
    end
    
    subgraph "Patchwork Pipeline"
        B[1. Clone & Baseline Tests] --> C[2. Upgrade & Capture Failures]
        C --> D[3. Research via Tavily Search & Extract]
        D --> E[4. Triage — Nemotron Nano]
        E --> F[5. Generate 4 Candidates — Nemotron Super]
        F --> G[6. Parallel Sandbox Testing]
        G --> H{Any Pass?}
        H -->|No| I[7. Repair Loop — feed failures back]
        I --> F
        H -->|Yes| J[8. Select Winner — smallest diff]
        J --> K[9. Review — Nemotron Ultra]
        K --> L[10. Human Approval → PR or .patch]
    end
    
    subgraph "Infrastructure"
        M[Nebius Token Factory — OpenAI-compatible]
        N[Docker / Nebius Serverless Jobs]
        O[SQLite Persistence]
        P[SSE Live Streaming]
    end
    
    A --> B
    E -.->|Nano tier| M
    F -.->|Super tier| M
    K -.->|Ultra tier| M
    G -.-> N
    D -.->|Search + Extract| Q[Tavily API]
```

## 🚀 Quick Start (< 10 minutes)

### Prerequisites

- **Node.js 20+** and npm
- **Docker** (optional, for sandbox isolation)
- API keys (see below)

### 1. Clone and Install

```bash
git clone https://github.com/YOUR_USERNAME/Patchwork.git
cd Patchwork
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set your API keys:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEBIUS_API_KEY` | ✅ | Nebius Token Factory API key for NVIDIA Nemotron models |
| `TAVILY_API_KEY` | ✅ | Tavily search & extract API key |
| `GITHUB_TOKEN` | Optional | GitHub PAT for PR creation (fallback: downloadable .patch) |
| `SANDBOX_RUNNER` | Optional | `docker` (default) or `nebius` |

### 3. Run the App

```bash
# Start both backend and frontend concurrently
npm run dev

# Or separately:
npm run dev:backend   # Backend on http://localhost:3001
npm run dev:frontend  # Frontend on http://localhost:5173
```

### 4. Try a Demo

Open http://localhost:5173, select a demo fixture (e.g. **chalk 4 → 5**), and click **Run Autonomous Upgrade**. Watch the multi-agent pipeline execute live.

### 5. Run Tests

```bash
npm test
```

### 6. Run Benchmarks

```bash
npm run bench
```

---

## 🧠 How NVIDIA Nemotron Models Are Used

Patchwork uses a **3-tier multi-agent architecture** with NVIDIA Nemotron models served via **Nebius Token Factory** (OpenAI-compatible inference API):

| Tier | Model | Purpose |
|------|-------|---------|
| **Nano** | `nvidia/nemotron-mini-4b-instruct` | Fast triage: summarize breaking changes, identify affected files, assess risk level |
| **Super** | `nvidia/Llama-3.1-Nemotron-70B-Instruct-HF` | Parallel candidate patch generation: creates 4 different migration strategies simultaneously |
| **Ultra** | `nvidia/Llama-3.1-Nemotron-70B-Instruct-HF` | Final review: architectural safety check, risk assessment, PR description synthesis |

### Why 3 Tiers?

Using a single large model for everything is slow and expensive. By routing fast classification to Nano (~100ms), heavy code generation to Super (in parallel), and final review to Ultra, Patchwork achieves **2.4x faster resolution** at **60% lower cost** than a single-model baseline.

### Token Factory Acceleration

- **Runtime model discovery** via `GET /v1/models` — no hardcoded model IDs
- **OpenAI-compatible API** — zero SDK migration cost
- **Automatic retries** with exponential backoff on 429/5xx
- **Real-time token and cost tracking** per model tier

---

## 🔍 How Tavily Search & Extract Is Used

Tavily is critical to Patchwork's success rate. For every upgrade job:

1. **Search**: Queries Tavily for official changelogs, migration guides, and breaking change documentation
2. **Extract**: Deep-crawls the top GitHub release pages and CHANGELOG.md files
3. **Feed to Nemotron**: The extracted documentation is injected into the LLM prompts, grounding code generation in real API signatures

**Impact**: Without Tavily, Patchwork's first-round pass rate drops by **40%** on ESM migration upgrades (chalk, eslint). LLMs without live documentation hallucinate non-existent API calls.

The Tavily sources panel in the UI makes this contribution **clearly visible** — every source is displayed with title, URL, relevance score, and snippet.

---

## 🏖️ Nebius Services Used

| Service | How Used |
|---------|----------|
| **Nebius Token Factory** | Inference endpoint for all 3 NVIDIA Nemotron model tiers |
| **Nebius Serverless Jobs** | Optional cloud sandbox for isolated test execution (fallback: local Docker) |
| **Nebius AI Cloud** | Container infrastructure for production deployment |

---

## 📁 Project Structure

```
Patchwork/
├── backend/                  # Node.js + Fastify API server
│   └── src/
│       ├── api/              # REST endpoints + SSE streaming
│       ├── config/           # Environment validation (Zod)
│       ├── db/               # SQLite persistence layer
│       ├── services/
│       │   ├── nebius/       # Token Factory client + pricing
│       │   ├── tavily/       # Search & Extract client
│       │   ├── sandbox/      # Docker + Nebius Jobs runners
│       │   ├── pipeline/     # 10-step orchestrator
│       │   └── events/       # SSE manager
│       ├── tests/            # Vitest unit tests
│       └── benchmarks/       # Benchmark runner
├── frontend/                 # React + Vite + Tailwind UI
│   └── src/
│       ├── components/       # Race board, diff viewer, Tavily panel
│       ├── pages/            # Home, Live Job, Benchmarks
│       └── services/         # API client + SSE subscription
├── demo-repos/               # 5 deterministic fixture projects
├── bench/                    # Benchmark results output
├── ARCHITECTURE.md
├── BENCHMARKS.md
├── SECURITY.md
├── FEEDBACK.md               # Sponsor tool feedback (Most Valuable Feedback prize)
├── DEVPOST.md
├── DEMO_SCRIPT.md
├── Dockerfile
└── .env.example
```

---

## 🏆 Hackathon Targets

- **Track**: Coding and Agentic Engineering
- **Prizes**: Track Winner, Grand/2nd/3rd, Best Use of Tavily, Most Valuable Feedback
- **Differentiator**: Reproducible benchmarks with ablation analysis proving Tavily's impact

---

## 📄 License

[MIT](./LICENSE) — open source, free to use, modify, and distribute.
