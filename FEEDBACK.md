# Feedback & Developer Experience Report

> **Competition Track:** Most Valuable Feedback (Nebius x NVIDIA Global AI Hackathon)  
> **Authors:** Patchwork Team  
> **Target Platforms:** Nebius Token Factory, Nebius AI Cloud / Serverless Jobs, NVIDIA Nemotron models, Tavily Search & Extract API

---

## 1. Executive Summary

During the development and testing of **Patchwork** (an autonomous multi-agent dependency upgrade and proof engine), our team extensively exercised the developer surfaces of:
1. **Nebius Token Factory** (OpenAI-compatible inference endpoint for NVIDIA Nemotron models)
2. **NVIDIA Nemotron 3-tier model ecosystem** (Nano / Super / Ultra tiers for triage, unified diff generation, and code review)
3. **Nebius Serverless Jobs / AI Cloud** (Containerized isolated sandbox execution for test validation)
4. **Tavily AI Search & Extract API** (Automated retrieval of migration changelogs and breaking change documentation)

Below is our detailed, constructive feedback detailing exact scenarios, observed behavior, expected behavior, root causes, and recommended improvements.

---

## 2. Nebius Token Factory

### 2.1 Model Discovery Endpoint (`/v1/models`) vs. Documentation Consistency
- **Scenario:** Dynamic model discovery at startup to avoid hardcoding model IDs and verify endpoint connectivity.
- **Observed Behavior:** Model listing response contains a wide catalog of models, but naming schemes vary between providers (e.g., `nvidia/Llama-3.1-Nemotron-70B-Instruct-HF` vs `meta-llama/Meta-Llama-3.1-8B-Instruct`). Certain documentation examples reference outdated slugs or lack parameter schemas for token counting and context windows.
- **Expected Behavior:** A standardized metadata payload on `GET /v1/models` including:
  1. `context_window` (maximum tokens supported)
  2. `pricing_per_1m_input_tokens` and `pricing_per_1m_output_tokens` (allowing real-time cost estimation without client-side hardcoding)
  3. `model_family` (e.g. `nemotron`, `llama`, `deepseek`)
- **Suggested Fix:** Include an extended `capabilities` or `metadata` dictionary in the OpenAI-compatible model object.

### 2.2 Rate Limiting and Retry Header Visibility (`Retry-After`)
- **Scenario:** Generating 4 candidate patches concurrently with Nemotron-70B during peak pipeline bursts.
- **Observed Behavior:** Rapid bursts may trigger `429 Too Many Requests`. Some responses return generic JSON error messages without an explicit HTTP `Retry-After` header or remaining token quota headers.
- **Expected Behavior:** Standardized RFC headers (`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`, `Retry-After`).
- **Patchwork Workaround:** Implemented exponential backoff with jitter in our Token Factory client (`exponentialBackoff(attempt, baseDelayMs)`).

---

## 3. NVIDIA Nemotron Models (Inference & Code Generation)

### 3.1 Strict Diff Output Formatting in Nemotron-70B
- **Scenario:** Instructing the model to generate a git unified diff (`diff --git a/... b/...`) with standard line headers (`@@ -L,N +L,N @@`).
- **Observed Behavior:** Without constrained system prompting, Nemotron occasionally wraps unified diffs inside prose explanations or markdown conversational wrappers (`"Here is the diff: ..."`), or omits leading spaces for unchanged context lines. Additionally, LLMs frequently miscount the hunk line count in headers (e.g. declaring `@@ -5,3 +5,3 @@` when only 1 line was added/deleted).
- **Expected Behavior:** Clean extraction of git diff blocks or support for grammar-constrained / JSON structured outputs for diff hunks.
- **Patchwork Solution:** We built a dedicated diff normalizer and sanitizer (`normalizeHunkHeaders` & `validateCandidateDiff`) that recalculates exact line numbers from hunk bodies, strips conversational chatter, ensures leading context whitespace, and guarantees hunks apply cleanly before sandbox testing.

---

## 4. Tavily Search & Extract API

### 4.1 Migration Guide Targeting and Domain Boosting
- **Scenario:** Searching for exact package version migration documentation (e.g., `chalk 4 to 5 ESM breaking changes migration guide`).
- **Observed Behavior:** Broad queries sometimes return generic blog posts or Stack Overflow threads rather than the canonical GitHub release notes (`releases/tag/v5.0.0`) or `CHANGELOG.md`.
- **Expected Behavior:** Tavily's extract API works exceptionally well when handed direct GitHub URLs. Having a built-in search filter or ranking boost for GitHub release tags and `CHANGELOG.md` files significantly improves recall for software engineering agents.
- **Patchwork Solution:** We crafted domain-boosted search queries prioritizing `github.com/*/releases`, `github.com/*/blob/*/CHANGELOG*`, and official documentation domains.

---

## 5. Nebius Serverless Jobs / Sandbox Execution

### 5.1 Ephemeral Container Startup Latency
- **Scenario:** Launching 4 parallel test sandbox runners to verify candidate patches against vitest/jest suites.
- **Observed Behavior:** Spinning up remote cloud jobs introduces cold-start latency compared to local cached containers.
- **Expected Behavior:** Pre-warmed Node.js container pools with pre-cached npm layers, or warm snapshot execution.
- **Patchwork Solution:** Implemented a unified `SandboxRunner` abstraction supporting both `NebiusJobRunner` and `LocalDockerRunner` with volume mount caching.

*(This document is actively updated throughout development)*
