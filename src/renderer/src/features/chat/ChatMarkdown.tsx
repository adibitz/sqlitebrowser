import Markdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Raw HTML in replies is not rendered (react-markdown's default), so model output can't inject markup.
const components: Components = {
  p: ({ node: _node, ...props }) => <p className="my-1.5 first:mt-0 last:mb-0" {...props} />,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-signal underline underline-offset-2">
      {children}
    </a>
  ),
  ul: ({ node: _node, ...props }) => <ul className="my-1.5 list-disc pl-5" {...props} />,
  ol: ({ node: _node, ...props }) => <ol className="my-1.5 list-decimal pl-5" {...props} />,
  code: ({ className, children }) =>
    className ? (
      <code className={className}>{children}</code>
    ) : (
      <code className="rounded-xs bg-surface-2 px-1 font-mono text-[0.92em]">{children}</code>
    ),
  pre: ({ node: _node, ...props }) => (
    <pre
      className="my-2 overflow-x-auto rounded-card bg-surface-2 p-3 font-mono text-label whitespace-pre"
      {...props}
    />
  ),
  table: ({ node: _node, ...props }) => (
    <div className="my-2 overflow-x-auto rounded-card border">
      <table className="w-full text-label tabular-nums" {...props} />
    </div>
  ),
  th: ({ node: _node, ...props }) => (
    <th className="border-b bg-surface-2 px-2 py-1 text-left font-medium" {...props} />
  ),
  td: ({ node: _node, ...props }) => (
    <td className="border-b px-2 py-1 align-top last:border-b-0" {...props} />
  ),
}

/** An assistant reply: Markdown with GitHub tables, in the panel's type and colours. */
export function ChatMarkdown({ text }: { text: string }) {
  return (
    <div className="min-w-0 text-body-sm leading-relaxed break-words select-text">
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </Markdown>
    </div>
  )
}
