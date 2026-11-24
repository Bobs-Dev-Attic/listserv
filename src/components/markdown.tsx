import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders Markdown safely. react-markdown escapes raw HTML by default, so this
 * is XSS-safe (no rehype-raw); GFM adds tables, strikethrough, autolinks, etc.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="md text-sm text-slate-200">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: (props) => <a {...props} target="_blank" rel="noreferrer nofollow" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
