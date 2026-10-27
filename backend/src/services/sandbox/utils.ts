import { applyPatch, parsePatch } from 'diff';
import fs from 'fs';
import path from 'path';

/**
 * Redact sensitive tokens and secrets from execution logs.
 */
export function sanitizeLogs(logs: string): string {
  return logs
    .replace(/(tvly-)[a-zA-Z0-9_-]+/g, '$1[REDACTED]')
    .replace(/(Bearer\s+)[a-zA-Z0-9_.-]+/gi, '$1[REDACTED]')
    .replace(/(ghp_[a-zA-Z0-9]+)/g, '[REDACTED_GITHUB_TOKEN]')
    .replace(/(api[-_]?key\s*[:=]\s*["']?)[^"'\s]+/gi, '$1[REDACTED]')
    .replace(/(password\s*[:=]\s*["']?)[^"'\s]+/gi, '$1[REDACTED]');
}

/**
 * Parse test output (vitest, jest, mocha, node:test) for passed/failed/total counts.
 */
export function parseTestCounts(output: string): { testCount: number; passCount: number; failCount: number } {
  let passCount = 0;
  let failCount = 0;

  // Vitest / Jest: Tests  4 passed (4) or 3 passed, 1 failed
  const jestPassMatch = output.match(/(\d+)\s+passed/i);
  if (jestPassMatch) {
    passCount = parseInt(jestPassMatch[1], 10);
  }

  const jestFailMatch = output.match(/(\d+)\s+failed/i);
  if (jestFailMatch) {
    failCount = parseInt(jestFailMatch[1], 10);
  }

  // TAP / node:test style: # pass 3, # fail 1
  const tapPassMatch = output.match(/#\s*pass\s+(\d+)/i);
  if (tapPassMatch) {
    passCount = Math.max(passCount, parseInt(tapPassMatch[1], 10));
  }

  const tapFailMatch = output.match(/#\s*fail\s+(\d+)/i);
  if (tapFailMatch) {
    failCount = Math.max(failCount, parseInt(tapFailMatch[1], 10));
  }

  // Mocha style: 4 passing (50ms), 1 failing
  const mochaPassMatch = output.match(/(\d+)\s+passing/i);
  if (mochaPassMatch) {
    passCount = Math.max(passCount, parseInt(mochaPassMatch[1], 10));
  }

  const mochaFailMatch = output.match(/(\d+)\s+failing/i);
  if (mochaFailMatch) {
    failCount = Math.max(failCount, parseInt(mochaFailMatch[1], 10));
  }

  // Fallback: If exit is 0 and output mentions "pass", count at least 1 pass
  if (passCount === 0 && failCount === 0) {
    if (output.toLowerCase().includes('pass') || output.toLowerCase().includes('ok')) {
      passCount = 1;
    }
  }

  const testCount = passCount + failCount;
  return { testCount, passCount, failCount };
}

/**
 * Validate that a unified diff string is well-formed and can be parsed.
 */
export function validateDiffSyntax(diffString: string): { valid: boolean; error?: string } {
  if (!diffString || diffString.trim() === '') {
    return { valid: false, error: 'Diff is empty' };
  }

  try {
    const patches = parsePatch(diffString);
    if (!patches || patches.length === 0) {
      return { valid: false, error: 'Could not parse any patch hunks from diff' };
    }
    return { valid: true };
  } catch (err) {
    return { valid: false, error: (err as Error).message };
  }
}

/**
 * Apply a unified diff to files inside the given directory.
 */
export function applyDiffToWorkspace(workspaceDir: string, diffString: string): { success: boolean; error?: string } {
  try {
    const patches = parsePatch(diffString);

    for (const patch of patches) {
      const relativePath = (patch.newFileName || patch.oldFileName || '').replace(/^[ab]\//, '');
      if (!relativePath) continue;

      const targetPath = path.resolve(workspaceDir, relativePath);

      let originalContent = '';
      if (fs.existsSync(targetPath)) {
        originalContent = fs.readFileSync(targetPath, 'utf8');
      }

      // Apply the patch
      const patched = applyPatch(originalContent, patch);

      if (patched === false) {
        return {
          success: false,
          error: `Failed to cleanly apply hunk to ${relativePath}`,
        };
      }

      // Ensure directory exists and write patched file
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, patched, 'utf8');
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: `Error applying diff: ${(err as Error).message}`,
    };
  }
}
