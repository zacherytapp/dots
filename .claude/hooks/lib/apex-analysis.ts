/**
 * Apex static-analysis helpers, ported from salesforce-claude-code
 * `scripts/lib/apex-analysis.js`.
 *
 * Known limitations (unchanged from upstream): `do { } while (...)` bodies
 * are not recognized as loops, and anonymous inner classes or static
 * initializer blocks can skew brace counting.
 */

/** Blank out comments and string literals, keeping line/column alignment. */
export function preprocessApex(code: string): string {
  const blank = (m: string) => m.replace(/[^\n]/g, " ");
  return code
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/\/\/.*$/gm, blank)
    .replace(/'(?:[^'\\\n]|\\.)*'/g, blank)
    .replace(/"(?:[^"\\\n]|\\.)*"/g, blank);
}

/** True when the class carries a class-level @IsTest annotation. */
export function isTestClass(code: string): boolean {
  const header = code.split("{")[0] ?? "";
  return /@istest\b/i.test(header);
}

function closingParen(
  text: string,
  from: number,
  startDepth = 0,
): { index: number; depth: number } {
  let depth = startDepth;
  for (let j = from; j < text.length; j++) {
    if (text[j] === "(") depth++;
    else if (text[j] === ")") {
      depth--;
      if (depth === 0) return { index: j, depth };
    }
  }
  return { index: -1, depth };
}

/**
 * Loop nesting depth per line of preprocessed Apex. depths[i] > 0 means line
 * i sits inside a for/while loop. Handles braced, Allman, unbraced, single
 * line and multi-line loop headers.
 */
export function trackLoopDepth(lines: string[]): number[] {
  const depths: number[] = [];
  let braceDepth = 0;
  const loopStack: number[] = [];
  let unbraced = 0;
  let parenDepth = 0;
  let pendingHeader = false;
  let waitingForBody = false;

  const afterHeader = (rest: string): number => {
    if (rest.includes("{")) loopStack.push(braceDepth);
    else if (/\S/.test(rest) && /;\s*$/.test(rest)) return 1;
    else if (/\S/.test(rest)) unbraced++;
    else waitingForBody = true;
    return 0;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    let bonus = 0;
    let skipDetection = false;

    if (!trimmed) {
      depths.push(loopStack.length + unbraced);
      continue;
    }

    if (pendingHeader) {
      const close = closingParen(trimmed, 0, parenDepth);
      if (close.index === -1) {
        parenDepth = close.depth;
        depths.push(loopStack.length + unbraced);
        continue;
      }
      pendingHeader = false;
      bonus = afterHeader(trimmed.slice(close.index + 1).trim());
      skipDetection = true;
    }

    if (waitingForBody && !skipDetection) {
      waitingForBody = false;
      if (trimmed.startsWith("{")) loopStack.push(braceDepth);
      else unbraced++;
    }

    const match = skipDetection ? null : /\b(?:for|while)\s*\(/.exec(trimmed);
    if (match) {
      const close = closingParen(trimmed, match.index);
      if (close.index === -1) {
        parenDepth = close.depth;
        pendingHeader = true;
      } else {
        bonus = afterHeader(trimmed.slice(close.index + 1).trim());
      }
    }

    depths.push(loopStack.length + unbraced + bonus);

    braceDepth += (trimmed.match(/\{/g) ?? []).length - (trimmed.match(/\}/g) ?? []).length;
    while (loopStack.length > 0 && braceDepth <= loopStack[loopStack.length - 1]!) loopStack.pop();

    if (unbraced > 0 && bonus === 0 && /;\s*$/.test(trimmed)) unbraced = 0;
  }
  return depths;
}
