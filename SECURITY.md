# Patchwork Security Model

## Principles

1. **Sandbox-only execution**: Untrusted code from cloned repositories is never executed on the host machine. All test runs happen inside Docker containers or Nebius Serverless Jobs with resource constraints.
2. **Secret redaction**: API keys, tokens, and credentials are stripped from all log output before storage or display. The `sanitizeLogs()` function scrubs patterns for Tavily keys (`tvly-*`), Bearer tokens, GitHub PATs (`ghp_*`), and generic `api_key=` patterns.
3. **Human approval gate**: No pull request is created without explicit human approval via the UI. Patchwork proposes — the developer decides.
4. **Environment isolation**: The `.env` file is gitignored. Sanitized configuration (with boolean flags like `hasNebiusApiKey: true/false` instead of raw values) is exposed via `/api/config`.

## Threat Model

| Threat | Mitigation |
|--------|-----------|
| Malicious code in cloned repo | Docker container with `--memory=2g --cpus=2` limits; network restricted where possible |
| Secret leakage in logs | `sanitizeLogs()` applied to all sandbox output before persistence |
| LLM prompt injection | System prompts are controlled server-side; user input is the repo URL and package name only |
| Unauthorized PR creation | GitHub PAT is optional; PR requires explicit `/approve` action; branch name is deterministic |
| Denial of service | Per-job timeout (`DOCKER_TIMEOUT_MS`, default 60s); max repair rounds capped at 3 |
| Cost runaway | Token usage tracked per request; cost estimates visible in UI; candidate count configurable |

## Resource Limits

| Resource | Limit | Configurable |
|----------|-------|-------------|
| Docker memory | 2 GB | Docker flag |
| Docker CPUs | 2 | Docker flag |
| Sandbox timeout | 60 seconds | `DOCKER_TIMEOUT_MS` env var |
| Max repair rounds | 3 | `MAX_REPAIR_ROUNDS` env var |
| Parallel candidates | 4 | `CANDIDATE_COUNT` env var |
| SSE event history | 500 per job | Hardcoded |

## Secret Management

- All secrets are loaded from `.env` (gitignored) and validated by Zod at startup
- The `/api/config` endpoint returns only boolean presence flags, never raw values
- Log sanitization runs on every sandbox execution output
- GitHub tokens are only used server-side via Octokit; never sent to the frontend

## Reporting Security Issues

If you find a security vulnerability, please open a GitHub issue or contact the maintainers directly. We take security seriously and will respond promptly.
