import { useMemo } from 'react';

const KEYWORDS = new Set([
  'module', 'fun', 'public', 'struct', 'let', 'if', 'else', 'return',
  'use', 'has', 'mut', 'const', 'entry', 'friend', 'as', 'spec',
  'acquires', 'native', 'move', 'copy', 'match', 'enum', 'type',
  'loop', 'while', 'break', 'continue', 'abort', 'for', 'in',
]);

const TYPES = new Set([
  'u8', 'u16', 'u32', 'u64', 'u128', 'u256',
  'bool', 'address', 'vector', 'String', 'Option',
  'TxContext', 'UID', 'ID', 'Balance', 'Coin', 'Clock',
]);

const ABILITIES = new Set(['key', 'store', 'drop']);

const COLORS: Record<string, string> = {
  keyword: '#c084fc',
  type: '#00d4ff',
  ability: '#22d3ee',
  number: '#fb923c',
  string: '#86efac',
  comment: '#374151',
  variable: '#cbd5e1',
  className: '#67e8f9',
  operator: '#6b7280',
  meta: '#a78bfa',
};

interface Token {
  text: string;
  color?: string;
  italic?: boolean;
  bold?: boolean;
}

function tokenize(code: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < code.length) {
    // Block comment
    if (code[i] === '/' && code[i + 1] === '*') {
      const end = code.indexOf('*/', i + 2);
      const close = end === -1 ? code.length : end + 2;
      tokens.push({ text: code.slice(i, close), color: COLORS.comment, italic: true });
      i = close;
      continue;
    }

    // Line comment (// and ///)
    if (code[i] === '/' && code[i + 1] === '/') {
      const end = code.indexOf('\n', i);
      const close = end === -1 ? code.length : end;
      tokens.push({ text: code.slice(i, close), color: COLORS.comment, italic: true });
      i = close;
      continue;
    }

    // String
    if (code[i] === '"' || (code[i] === 'b' && code[i + 1] === '"')) {
      const start = i;
      if (code[i] === 'b') i++;
      i++; // skip opening quote
      while (i < code.length && code[i] !== '"') {
        if (code[i] === '\\') i++;
        i++;
      }
      if (i < code.length) i++; // skip closing quote
      tokens.push({ text: code.slice(start, i), color: COLORS.string });
      continue;
    }

    // Attribute (#[...])
    if (code[i] === '#' && code[i + 1] === '[') {
      const end = code.indexOf(']', i + 2);
      const close = end === -1 ? code.length : end + 1;
      tokens.push({ text: code.slice(i, close), color: COLORS.meta });
      i = close;
      continue;
    }

    // Number (hex or decimal)
    if (code[i] === '0' && code[i + 1] === 'x') {
      const start = i;
      i += 2;
      while (i < code.length && /[0-9a-fA-F_]/.test(code[i])) i++;
      tokens.push({ text: code.slice(start, i), color: COLORS.number });
      continue;
    }
    if (/\d/.test(code[i])) {
      const start = i;
      while (i < code.length && /[\d_]/.test(code[i])) i++;
      // optional type suffix like u64
      if (code[i] === 'u' && /\d/.test(code[i + 1])) {
        i++;
        while (i < code.length && /\d/.test(code[i])) i++;
      }
      tokens.push({ text: code.slice(start, i), color: COLORS.number });
      continue;
    }

    // Word (keyword, type, identifier)
    if (/[A-Za-z_]/.test(code[i])) {
      const start = i;
      while (i < code.length && /[A-Za-z0-9_]/.test(code[i])) i++;
      // Check for ! suffix (macros like assert!)
      if (i < code.length && code[i] === '!') i++;
      const word = code.slice(start, i);
      const base = word.replace(/!$/, '');

      if (KEYWORDS.has(base)) {
        tokens.push({ text: word, color: COLORS.keyword, bold: true });
      } else if (TYPES.has(base)) {
        tokens.push({ text: word, color: COLORS.type });
      } else if (ABILITIES.has(base)) {
        tokens.push({ text: word, color: COLORS.ability, italic: true });
      } else if (/^[A-Z]/.test(base)) {
        tokens.push({ text: word, color: COLORS.className });
      } else {
        tokens.push({ text: word, color: COLORS.variable });
      }
      continue;
    }

    // Operators and punctuation
    if (/[:;,.()\[\]{}<>+\-*/%&|^!=@]/.test(code[i])) {
      tokens.push({ text: code[i], color: COLORS.operator });
      i++;
      continue;
    }

    // Whitespace and anything else
    tokens.push({ text: code[i] });
    i++;
  }

  return tokens;
}

export function MoveHighlight({ code }: { code: string }) {
  const tokens = useMemo(() => tokenize(code), [code]);

  return (
    <>
      {tokens.map((token, i) => {
        if (!token.color) return token.text;
        return (
          <span
            key={i}
            style={{
              color: token.color,
              fontStyle: token.italic ? 'italic' : undefined,
              fontWeight: token.bold ? '600' : undefined,
            }}
          >
            {token.text}
          </span>
        );
      })}
    </>
  );
}
