# Patchwork Benchmark Results

## Evaluation Methodology

We benchmarked Patchwork across **5 deterministic, version-pinned fixture repositories**, each containing a known breaking dependency upgrade. All fixtures have passing test suites before the upgrade.

Three modes were evaluated:

| Mode | Description |
|------|-------------|
| **Patchwork (Full)** | 3-tier Nemotron models + Tavily Search & Extract + 4 parallel candidates + sandbox testing |
| **Baseline** | Single model, single attempt, no Tavily, no parallelism |
| **No-Tavily Ablation** | Multi-agent Nemotron pipeline but with Tavily disabled — measures documentation grounding impact |

## Results Summary

| Metric | Patchwork | Baseline | No-Tavily |
|--------|-----------|----------|-----------|
| **Success Rate** | **100% (5/5)** | 40% (2/5) | 60% (3/5) |
| **Avg Fix Duration** | **7.5s** | 18.4s | 11.2s |
| **Avg Tokens Used** | 1,306 | 780 | 1,040 |
| **Avg Cost Per Fix** | **$0.0016** | $0.0010 | $0.0014 |
| **Tavily Impact** | — | — | **+40% success rate lift** |

## Per-Fixture Breakdown

| Fixture | Challenge | Baseline | No-Tavily | Patchwork | Duration | Cost |
|---------|-----------|----------|-----------|-----------|----------|------|
| chalk 4→5 | Pure ESM migration | ❌ FAIL | ❌ FAIL | ✅ PASS | 8.2s | $0.0016 |
| node-fetch 2→3 | CJS to ESM + buffer | ❌ FAIL | ✅ PASS | ✅ PASS | 7.9s | $0.0018 |
| express 4→5 | Async errors & wildcards | ✅ PASS | ✅ PASS | ✅ PASS | 6.4s | $0.0014 |
| commander 8→12 | .opts() API accessor | ✅ PASS | ✅ PASS | ✅ PASS | 5.8s | $0.0012 |
| eslint 8→9 | Flat config migration | ❌ FAIL | ❌ FAIL | ✅ PASS | 9.5s | $0.0021 |

## Key Findings

### 1. Tavily is Decisive for Paradigm Shifts

The two hardest upgrades — chalk (CommonJS → pure ESM) and ESLint (`.eslintrc` → `eslint.config.js`) — require knowledge of entirely new API patterns that didn't exist in training data. Without Tavily's live documentation extraction, all models (including 70B Nemotron) hallucinate non-existent APIs or attempt invalid CommonJS requires.

**Tavily lift: +40% success rate** (from 60% to 100%).

### 2. Multi-Agent Tier Routing Saves Time and Cost

By routing fast classification to Nemotron Nano (~100ms) and parallelizing 4 candidate strategies on Nemotron Super, Patchwork resolves upgrades **2.4x faster** than a sequential single-model approach.

### 3. Parallel Candidate Strategies Provide Robustness

Different strategies (minimal, adapter, codemod, refactor) explore different solution spaces. When one strategy fails, others often succeed — this is especially important for complex ESM migrations where the "right" approach isn't obvious.

### 4. Cost is Negligible

At an average of **$0.0016 per successful upgrade**, Patchwork is orders of magnitude cheaper than manual developer time. A developer spending 2 hours on an ESM migration costs ~$150 at market rates.

## Reproduce

```bash
npm run bench
# Results written to bench/results.json
```
