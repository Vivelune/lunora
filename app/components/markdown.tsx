import ReactMarkdown from "react-markdown";

export function Markdown({ children }: { children: string }) {
  return (
    <div className="flex flex-col gap-3 leading-7">
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h1 className="mt-4 text-3xl font-bold">{children}</h1>,
          h2: ({ children }) => <h2 className="mt-4 text-2xl font-semibold">{children}</h2>,
          h3: ({ children }) => <h3 className="mt-3 text-xl font-semibold">{children}</h3>,
          p: ({ children }) => <p>{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-6">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-6">{children}</ol>,
          li: ({ children }) => <li className="my-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 pl-4 text-gray-600">{children}</blockquote>
          ),
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="underline">
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="rounded bg-gray-100 px-1 py-0.5 text-sm">{children}</code>
          ),
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded bg-gray-100 p-3 text-sm">{children}</pre>
          ),
          // Images are intentionally not rendered until secure uploads exist.
          img: ({ src, alt }) => {
            if (typeof src !== "string" || !/^\/api\/resources\/[a-z0-9]+$/.test(src)) {
              return null;
            }
            // eslint-disable-next-line @next/next/no-img-element
            return <img src={src} alt={alt ?? ""} loading="lazy" className="max-w-full rounded border" />;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}