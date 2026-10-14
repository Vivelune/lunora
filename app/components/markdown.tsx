import ReactMarkdown from "react-markdown";

export function Markdown({ children }: { children: string }) {
  return (
    <div className="flex flex-col gap-4 leading-7 text-neutral-300">
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="mt-6 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-6 text-xl font-semibold tracking-tight text-white sm:text-2xl">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-5 text-lg font-semibold tracking-tight text-white">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="mt-4 text-base font-semibold text-white">
              {children}
            </h4>
          ),

          p: ({ children }) => {
            // Markdown can end up wrapping block content in a paragraph when
            // raw HTML or malformed input is present. Rendering <p> with a
            // block child produces invalid HTML, and the server + client
            // disagree on how to recover — causing a hydration mismatch.
            // Fall back to <div> when any child is block-level.
            const BLOCK = new Set([
              "div",
              "p",
              "ul",
              "ol",
              "li",
              "table",
              "thead",
              "tbody",
              "tr",
              "td",
              "th",
              "pre",
              "blockquote",
              "h1",
              "h2",
              "h3",
              "h4",
              "h5",
              "h6",
              "section",
              "article",
              "figure",
              "img",
            ]);

            const hasBlockChild =
              Array.isArray(children) &&
              children.some((child) => {
                if (typeof child !== "object" || child === null) return false;
                const type = (child as { type?: unknown }).type;
                return typeof type === "string" && BLOCK.has(type);
              });

            const className =
              "text-[15px] leading-relaxed text-neutral-300";

            return hasBlockChild ? (
              <div className={className}>{children}</div>
            ) : (
              <p className={className}>{children}</p>
            );
          },

          ul: ({ children }) => (
            <ul className="flex flex-col gap-1.5 pl-5 text-[15px] leading-relaxed text-neutral-300 [&>li]:relative [&>li]:pl-4 [&>li]:before:absolute [&>li]:before:left-0 [&>li]:before:top-[0.7em] [&>li]:before:h-1 [&>li]:before:w-1 [&>li]:before:rounded-full [&>li]:before:bg-violet-400/60">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="flex flex-col gap-1.5 pl-6 text-[15px] leading-relaxed text-neutral-300 [counter-reset:md-ol]">
              {children}
            </ol>
          ),
          li: ({ children }) => <li>{children}</li>,

          blockquote: ({ children }) => (
            <blockquote className="rounded-r-lg border-l-2 border-violet-400/40 bg-white/[0.02] py-1 pl-4 text-[15px] italic text-neutral-400">
              {children}
            </blockquote>
          ),

          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-violet-300 underline-offset-2 transition-colors hover:text-violet-200 hover:underline"
            >
              {children}
            </a>
          ),

          code: ({ children, className }) => {
            // Inline code only — block code is handled in `pre` below.
            const isBlock = className?.includes("language-");
            if (isBlock) {
              return <code className={className}>{children}</code>;
            }
            return (
              <code className="rounded-md border border-white/5 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[13px] text-violet-200">
                {children}
              </code>
            );
          },

          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-xl border border-white/10 bg-neutral-900/80 p-4 font-mono text-[13px] leading-relaxed text-neutral-200">
              {children}
            </pre>
          ),

          hr: () => <hr className="my-2 border-white/10" />,

          strong: ({ children }) => (
            <strong className="font-semibold text-white">{children}</strong>
          ),

          em: ({ children }) => (
            <em className="text-neutral-200 italic">{children}</em>
          ),

          table: ({ children }) => (
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full border-collapse text-left text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="border-b border-white/10 bg-white/[0.02]">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2.5 text-xs font-medium uppercase tracking-[0.14em] text-neutral-400">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-t border-white/5 px-4 py-2.5 text-neutral-300">
              {children}
            </td>
          ),

          // Images are intentionally not rendered until secure uploads exist.
          img: ({ src, alt }) => {
            if (
              typeof src !== "string" ||
              !/^\/api\/resources\/[a-z0-9]+$/.test(src)
            ) {
              return null;
            }
            // eslint-disable-next-line @next/next/no-img-element
            return (
              <img
                src={src}
                alt={alt ?? ""}
                loading="lazy"
                className="my-2 max-w-full rounded-xl border border-white/10"
              />
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}