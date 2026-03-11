import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`markdown-body flex flex-col ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="mb-3 text-sm leading-7 text-[#94a3b8]">{children}</p>
          ),
          h3: ({ children }) => (
            <h3 className="text-[15px] font-bold text-text mt-1 mb-2">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mt-1 mb-1.5">
              {children}
            </h4>
          ),
          strong: ({ children }) => (
            <strong className="text-text font-semibold">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="text-cyan italic">{children}</em>
          ),
          ul: ({ children }) => (
            <ul className="pl-5 flex flex-col gap-1 mb-3 text-[#94a3b8] text-sm leading-7">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="pl-5 flex flex-col gap-1 mb-3 text-[#94a3b8] text-sm leading-7 list-decimal">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="mb-1">{children}</li>,
          code: ({ className, children, ...props }) => {
            const isBlock = className?.includes('language-');
            if (isBlock) {
              return (
                <code
                  className="font-mono text-xs text-[#94a3b8] bg-transparent border-none p-0 rounded-none"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                className="font-mono text-xs text-cyan bg-cyan/[0.07] border border-cyan/[0.18] rounded px-1.5 py-px"
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="bg-panel-raised border border-border border-l-[3px] border-l-cyan-dim rounded-md p-3.5 overflow-x-auto mb-3">
              {children}
            </pre>
          ),
          a: ({ href, children }) => (
            <a href={href} className="text-cyan no-underline hover:underline">
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
