import { validateDiffSyntax } from '../sandbox/utils.js';

/**
 * Normalizes hunk header line counts (@@ -L,N +L,N @@) to match the actual
 * deleted (-), inserted (+), and context ( ) lines provided in the hunk.
 * LLMs frequently miscount the lines in the header.
 */
export function normalizeHunkHeaders(diff: string): string {
  const lines = diff.split('\n');
  const result: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const hunkHeaderMatch = line.match(/^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@(.*)$/);

    if (hunkHeaderMatch) {
      const oldStart = hunkHeaderMatch[1];
      const newStart = hunkHeaderMatch[2];
      const suffix = hunkHeaderMatch[3] || '';

      // Count lines until next hunk or next file header
      let oldLines = 0;
      let newLines = 0;
      const hunkBodyLines: string[] = [];
      let j = i + 1;

      while (j < lines.length) {
        const bodyLine = lines[j];
        if (bodyLine.startsWith('@@') || bodyLine.startsWith('--- ') || bodyLine.startsWith('diff --git')) {
          break;
        }

        if (bodyLine.startsWith('-')) {
          oldLines++;
          hunkBodyLines.push(bodyLine);
        } else if (bodyLine.startsWith('+')) {
          newLines++;
          hunkBodyLines.push(bodyLine);
        } else if (bodyLine.startsWith(' ') || bodyLine === '') {
          // Context line
          oldLines++;
          newLines++;
          // Ensure leading space for context
          hunkBodyLines.push(bodyLine.startsWith(' ') ? bodyLine : ` ${bodyLine}`);
        } else {
          // Other unexpected line
          oldLines++;
          newLines++;
          hunkBodyLines.push(` ${bodyLine}`);
        }
        j++;
      }

      result.push(`@@ -${oldStart},${oldLines} +${newStart},${newLines} @@${suffix}`);
      result.push(...hunkBodyLines);
      i = j;
    } else {
      result.push(line);
      i++;
    }
  }

  return result.join('\n');
}

export function extractUnifiedDiff(rawOutput: string): string {
  let cleaned = rawOutput.trim();

  // Strip markdown diff code blocks if wrapped
  const diffBlockMatch = cleaned.match(/```(?:diff|patch)?\s*\n([\s\S]*?)\n```/);
  if (diffBlockMatch) {
    cleaned = diffBlockMatch[1].trim();
  } else {
    // If text starts before diff header, find the first occurrence of --- or diff --git
    const diffIndex = cleaned.search(/(?:diff --git|--- [ab]\/)/);
    if (diffIndex !== -1) {
      cleaned = cleaned.slice(diffIndex).trim();
    }
  }

  // Normalize header line counts
  cleaned = normalizeHunkHeaders(cleaned);

  // Ensure trailing newline
  if (!cleaned.endsWith('\n')) {
    cleaned += '\n';
  }

  return cleaned;
}

export function validateCandidateDiff(rawDiff: string): { valid: boolean; cleanedDiff: string; error?: string } {
  const cleanedDiff = extractUnifiedDiff(rawDiff);
  const validation = validateDiffSyntax(cleanedDiff);

  return {
    valid: validation.valid,
    cleanedDiff,
    error: validation.error,
  };
}
