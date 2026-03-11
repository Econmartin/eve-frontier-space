import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

const moveDarkTheme = EditorView.theme({}, { dark: true });

const moveDarkHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: '#c084fc', fontWeight: '600' },
  { tag: tags.typeName, color: '#00d4ff' },
  { tag: tags.atom, color: '#22d3ee', fontStyle: 'italic' },
  { tag: tags.number, color: '#fb923c' },
  { tag: tags.string, color: '#86efac' },
  { tag: tags.comment, color: '#374151', fontStyle: 'italic' },
  { tag: tags.variableName, color: '#cbd5e1' },
  { tag: tags.className, color: '#67e8f9' },
  { tag: tags.operator, color: '#6b7280' },
  { tag: tags.meta, color: '#a78bfa' },
  { tag: tags.definition(tags.variableName), color: '#67e8f9' },
]);

export const moveDark = [moveDarkTheme, syntaxHighlighting(moveDarkHighlight)];
