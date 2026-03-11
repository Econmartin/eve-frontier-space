import { LanguageSupport, StreamLanguage } from '@codemirror/language';
import type { StreamParser } from '@codemirror/language';

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

interface MoveState {
  inBlock: boolean;
}

const moveParser: StreamParser<MoveState> = {
  startState: () => ({ inBlock: false }),

  token(stream, state) {
    if (state.inBlock) {
      if (stream.match('*/')) state.inBlock = false;
      else stream.next();
      return 'comment';
    }

    if (stream.match('//')) { stream.skipToEnd(); return 'comment'; }
    if (stream.match('/*')) { state.inBlock = true; return 'comment'; }

    if (stream.match(/b"(?:[^"\\]|\\.)*"/)) return 'string';
    if (stream.match(/"(?:[^"\\]|\\.)*"/)) return 'string';
    if (stream.match(/#\[/)) return 'meta';
    if (stream.match(/0x[0-9a-fA-F_]+/)) return 'number';
    if (stream.match(/\d[\d_]*(?:u\d+)?/)) return 'number';

    if (stream.match(/[A-Za-z_][A-Za-z0-9_]*/)) {
      const w = stream.current();
      if (KEYWORDS.has(w)) return 'keyword';
      if (TYPES.has(w)) return 'typeName';
      if (ABILITIES.has(w)) return 'atom';
      if (/^[A-Z]/.test(w)) return 'className';
      return 'variableName';
    }

    if (stream.match(/[:;,.()\[\]{}<>+\-*/%&|^!=@]/)) return 'operator';
    stream.next();
    return null;
  },

  languageData: {
    commentTokens: { line: '//', block: { open: '/*', close: '*/' } },
  },
};

const moveLanguage = StreamLanguage.define(moveParser);

export function move() {
  return new LanguageSupport(moveLanguage);
}
