import { useRef, useEffect, useCallback } from 'react';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { EditorState, Prec } from '@codemirror/state';
import { defaultKeymap, indentWithTab } from '@codemirror/commands';
import { move } from '@/lib/move-lang';
import { moveDark } from '@/lib/move-theme';

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  onRun?: () => void;
}

export function CodeEditor({ value, onChange, onRun }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onRunRef = useRef(onRun);
  onChangeRef.current = onChange;
  onRunRef.current = onRun;

  useEffect(() => {
    if (!containerRef.current) return;

    const runKeymap = Prec.highest(
      keymap.of([
        {
          key: 'Mod-Enter',
          run: () => {
            onRunRef.current?.();
            return true;
          },
        },
      ]),
    );

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChangeRef.current?.(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        keymap.of([...defaultKeymap, indentWithTab]),
        runKeymap,
        move(),
        ...moveDark,
        updateListener,
        EditorState.tabSize.of(4),
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // Sync external value changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  return (
    <div className="flex flex-col flex-1 min-h-0 border-b border-border overflow-hidden">
      <div className="font-mono text-xs font-semibold tracking-[0.09em] uppercase text-text-muted px-3.5 py-1.5 bg-panel border-b border-border shrink-0">
        EDITOR — Move
      </div>
      <div ref={containerRef} className="flex-1 overflow-hidden min-h-0" />
    </div>
  );
}
