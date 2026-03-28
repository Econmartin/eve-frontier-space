import { LanguageSupport, StreamLanguage } from '@codemirror/language';
import type { StreamParser } from '@codemirror/language';
import { MOVE_KEYWORDS, MOVE_TYPES, MOVE_ABILITIES } from '@/lib/move-tokens';

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
      if (MOVE_KEYWORDS.has(w)) return 'keyword';
      if (MOVE_TYPES.has(w)) return 'typeName';
      if (MOVE_ABILITIES.has(w)) return 'atom';
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
