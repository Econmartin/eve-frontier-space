/**
 * Shared Move language token sets used by both the CodeMirror syntax
 * highlighter (move-lang.ts) and the inline Markdown highlighter
 * (MoveHighlight.tsx). Keeping them in one place ensures they stay in sync.
 */

export const MOVE_KEYWORDS = new Set([
  'module', 'fun', 'public', 'struct', 'let', 'if', 'else', 'return',
  'use', 'has', 'mut', 'const', 'entry', 'friend', 'as', 'spec',
  'acquires', 'native', 'move', 'copy', 'match', 'enum', 'type',
  'loop', 'while', 'break', 'continue', 'abort', 'for', 'in',
]);

export const MOVE_TYPES = new Set([
  'u8', 'u16', 'u32', 'u64', 'u128', 'u256',
  'bool', 'address', 'vector', 'String', 'Option',
  'TxContext', 'UID', 'ID', 'Balance', 'Coin', 'Clock',
]);

/** Sui object abilities — highlighted distinctly from keywords and types. */
export const MOVE_ABILITIES = new Set(['key', 'store', 'drop']);
