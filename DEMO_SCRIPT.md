# Patchwork Demo Script (3-minute video)

## 🎯 Structure: 20s Problem → 2m Live Demo → 40s Results

---

## Part 1: The Problem (0:00 — 0:20)

**[Screen: Terminal showing a failed `npm test` after upgrading chalk 4 → 5]**

> "Every developer knows this pain. You upgrade a dependency, and everything breaks. Chalk moved to pure ESM. node-fetch dropped CommonJS. ESLint rewrote its config format.
>
> Dependabot can bump the version — but who fixes the code? Today, that's you. Hours of reading changelogs, rewriting imports, running tests.
>
> What if an AI agent could do all of this — and prove it works?"

---

## Part 2: Live Demo (0:20 — 2:20)

### Scene 1: Launch (0:20 — 0:40)

**[Screen: Patchwork UI — Home page]**

> "This is Patchwork. I'll select the chalk 4-to-5 demo fixture."

- Select "Chalk 4 → 5 (Pure ESM Migration)" from the demo dropdown
- Click **Run Autonomous Upgrade**

> "Patchwork is now autonomously cloning the repo, verifying the baseline tests pass, then bumping chalk to v5."

### Scene 2: Research & Triage (0:40 — 1:00)

**[Screen: Live Job Page — Timeline advancing, Tavily panel populating]**

> "Watch the Tavily panel — it just searched for chalk's official migration guide and extracted the release notes from GitHub. These exact API signatures will ground the AI's code generation."

**[Point to Model Tier Badges showing Nano is active]**

> "Nemotron Nano is triaging the breaking changes — ESM-only module, require() no longer works. Risk level: LOW."

### Scene 3: Candidate Race Board (1:00 — 1:40)

**[Screen: Race Board showing 4 candidates generating in parallel]**

> "Now Nemotron Super generates four candidate patches in parallel — four different migration strategies racing against each other. Each runs in its own Docker sandbox."

**[Wait for candidates to show test results]**

> "The minimal strategy just passed all 3 tests in 1.2 seconds! The adapter strategy also passed. Patchwork selects the winner — smallest diff, fastest tests."

**[Point to winning candidate's crown badge]**

### Scene 4: Review & Approve (1:40 — 2:20)

**[Screen: Diff Viewer showing the winning patch]**

> "Nemotron Ultra reviewed the patch for architectural safety. Here's the unified diff — it added 'type: module' to package.json and converted require() to import."

**[Click Approve & Create PR]**

> "One click. The PR is created on GitHub with a detailed description: what broke, what changed, why, evidence from Tavily sources, and a risk assessment. Human approved. Nothing auto-merges."

---

## Part 3: Results (2:20 — 3:00)

**[Screen: Benchmarks page]**

> "We benchmarked Patchwork on 5 fixture repos. Patchwork achieved 100% success across all 5 — including chalk ESM and ESLint flat config, which even 70B models fail on without live documentation.
>
> The key insight: Tavily raises the success rate by 40%. Without real-time migration guides, LLMs hallucinate non-existent APIs.
>
> Average cost per upgrade: less than a fifth of a cent. Average time: under 8 seconds.
>
> Patchwork: dependency upgrades that fix themselves, and prove it."

**[End on Patchwork logo + tagline]**
