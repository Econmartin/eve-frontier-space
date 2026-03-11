import type { TaskPage, ValidationResult } from './types';

interface TerminalLine {
  text: string;
  type: 'prompt' | 'success' | 'error' | 'error-detail' | 'data' | 'info' | 'muted' | 'blank' | 'placeholder';
}

function checkSyntax(code: string): string | null {
  const trimmed = code.trim();
  if (
    !trimmed ||
    (trimmed.startsWith('//') &&
      trimmed.split('\n').every((l) => l.trim() === '' || l.trim().startsWith('//')))
  ) {
    return 'Your code is empty. Start typing below!';
  }

  let braceCount = 0;
  let inString = false;
  let inLineComment = false;

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    const next = trimmed[i + 1];

    if (ch === '\n') {
      inLineComment = false;
      continue;
    }
    if (inLineComment) continue;

    if (ch === '/' && next === '/') {
      inLineComment = true;
      i++;
      continue;
    }

    if (!inString && ch === '"') {
      inString = true;
      continue;
    }
    if (inString && ch === '"' && trimmed[i - 1] !== '\\') {
      inString = false;
      continue;
    }
    if (inString) continue;

    if (ch === '{') braceCount++;
    else if (ch === '}') {
      braceCount--;
      if (braceCount < 0) return 'Unexpected `}` — check your closing braces.';
    }
  }

  if (braceCount > 0) {
    return `Missing ${braceCount} closing brace${braceCount > 1 ? 's' : ''} — every \`{\` needs a matching \`}\`.`;
  }

  return null;
}

export const MoveSimulator = {
  validate(code: string, lesson: TaskPage): ValidationResult {
    const syntaxError = checkSyntax(code);
    if (syntaxError) return { success: false, error: syntaxError };

    for (const check of lesson.checks) {
      if (!check.test(code)) {
        return { success: false, error: check.errorMsg };
      }
    }
    return { success: true, error: null };
  },

  formatOutput(outputStr: string): TerminalLine[] {
    return outputStr.split('\n').map((line) => {
      let type: TerminalLine['type'] = 'info';
      if (line.startsWith('$')) type = 'prompt';
      else if (line.startsWith('✓') || line.includes('Successful') || line.includes('PASS'))
        type = 'success';
      else if (line.trim() === '') type = 'blank';
      else if (
        line.startsWith('  ') &&
        (line.includes('→') || line.includes(':') || line.includes('ObjectID'))
      )
        type = 'data';
      return { text: line, type };
    });
  },

  formatError(errorMsg: string): TerminalLine[] {
    return [
      { text: '$ sui move build', type: 'prompt' },
      { text: 'error[E0001]: Compilation failed', type: 'error' },
      { text: '', type: 'blank' },
      { text: '  ' + errorMsg, type: 'error-detail' },
      { text: '', type: 'blank' },
      { text: 'Fix the issue above and press Run again.', type: 'muted' },
    ];
  },
};

export type { TerminalLine };
