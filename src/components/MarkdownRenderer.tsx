"use client";

import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import { processWikilinks, parseFrontmatter } from "@/lib/markdown";

// Import KaTeX styles
import "katex/dist/katex.min.css";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Isolated Mermaid Diagram component for stable rendering without DOM mutation side-effects.
 */
const MermaidDiagram: React.FC<{ code: string }> = ({ code }) => {
  const [svgHtml, setSvgHtml] = useState<string>("");
  const idRef = useRef(`mermaid-${Math.random().toString(36).substring(2, 9)}`);

  useEffect(() => {
    let isMounted = true;
    if (typeof window !== "undefined" && code.trim()) {
      import("mermaid").then((mermaid) => {
        mermaid.default.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "loose",
          fontFamily: "var(--font-geist-sans), sans-serif",
        });

        const renderId = `mermaid-id-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        mermaid.default
          .render(renderId, code)
          .then(({ svg }) => {
            if (isMounted) {
              setSvgHtml(svg);
            }
          })
          .catch((err) => {
            console.error("Mermaid diagram error:", err);
          });
      });
    }

    return () => {
      isMounted = false;
    };
  }, [code]);

  if (!svgHtml) {
    return (
      <div className="my-4 p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 text-xs font-mono text-neutral-500 animate-pulse flex items-center justify-center">
        Rendering diagram...
      </div>
    );
  }

  return (
    <div
      className="mermaid-diagram-container my-4 p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 flex justify-center items-center overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svgHtml }}
    />
  );
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = "" }) => {
  const { body } = parseFrontmatter(content);
  const processedMarkdown = processWikilinks(body);

  return (
    <div className={`markdown-body prose prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex]}
        components={{
          // Custom Callout rendering
          blockquote({ children }) {
            const childrenArray = React.Children.toArray(children);
            const firstChild = childrenArray[0];

            let calloutType: string | null = null;
            if (React.isValidElement(firstChild)) {
              const props = firstChild.props as { children?: any };
              if (typeof props?.children === "string") {
                const text = props.children;
                const match = text.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);
                if (match) {
                  calloutType = match[1].toUpperCase();
                }
              }
            }

            if (calloutType) {
              const stylesMap: Record<string, { bg: string; border: string; icon: string; title: string; color: string }> = {
                NOTE: { bg: "bg-blue-950/40", border: "border-blue-500", icon: "ℹ️", title: "Note", color: "text-blue-400" },
                TIP: { bg: "bg-emerald-950/40", border: "border-emerald-500", icon: "💡", title: "Tip", color: "text-emerald-400" },
                IMPORTANT: { bg: "bg-purple-950/40", border: "border-purple-500", icon: "📌", title: "Important", color: "text-purple-400" },
                WARNING: { bg: "bg-amber-950/40", border: "border-amber-500", icon: "⚠️", title: "Warning", color: "text-amber-400" },
                CAUTION: { bg: "bg-rose-950/40", border: "border-rose-500", icon: "🚨", title: "Caution", color: "text-rose-400" },
              };

              const style = stylesMap[calloutType] || stylesMap.NOTE;

              return (
                <div className={`my-4 p-4 rounded-xl border-l-4 ${style.border} ${style.bg} backdrop-blur-md`}>
                  <div className={`flex items-center gap-2 font-semibold text-sm mb-2 ${style.color}`}>
                    <span>{style.icon}</span>
                    <span>{style.title}</span>
                  </div>
                  <div className="text-neutral-300 text-sm leading-relaxed">{children}</div>
                </div>
              );
            }

            return (
              <blockquote className="border-l-4 border-indigo-500 pl-4 my-4 italic text-neutral-300 bg-neutral-900/40 py-2 rounded-r-lg">
                {children}
              </blockquote>
            );
          },

          // Custom code block & Mermaid rendering
          code({ className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "";
            const isInline = !match;
            const rawCode = String(children).replace(/\n$/, "");

            if (language === "mermaid") {
              return <MermaidDiagram code={rawCode} />;
            }

            if (isInline) {
              return (
                <code className="bg-neutral-800/80 text-indigo-300 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                  {children}
                </code>
              );
            }

            return (
              <div className="relative group my-4 rounded-xl overflow-hidden border border-neutral-800 bg-neutral-950/90 shadow-lg">
                {language && (
                  <div className="flex justify-between items-center px-4 py-1.5 bg-neutral-900/80 border-b border-neutral-800/80 text-xs font-mono text-neutral-400">
                    <span>{language}</span>
                  </div>
                )}
                <pre className="p-4 overflow-x-auto text-sm font-mono text-neutral-200">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            );
          },

          // Custom link renderer for internal wikilinks / routing
          a({ href, children }) {
            const isInternal = href?.startsWith("/") || href?.startsWith("#");
            if (isInternal) {
              return (
                <a href={href} className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4 decoration-indigo-500/50 transition-colors font-medium">
                  {children}
                </a>
              );
            }
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4 decoration-indigo-500/50 transition-colors">
                {children}
              </a>
            );
          },
        }}
      >
        {processedMarkdown}
      </ReactMarkdown>
    </div>
  );
};
