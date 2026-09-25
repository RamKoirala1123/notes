"use client";

import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import { processWikilinks, parseFrontmatter } from "@/lib/markdown";

import { Info, Lightbulb, AlertTriangle, Bookmark, ShieldAlert, ExternalLink } from "lucide-react";

// Import KaTeX styles
import "katex/dist/katex.min.css";

interface MarkdownRendererProps {
  content: string;
  className?: string;
  onToggleTask?: (taskIndex: number, checked: boolean) => void;
}

/**
 * Normalizes callouts so lines starting with !note, !warning, !tip, [!note], etc.
 * get recognized as blockquotes even if the user didn't start the line with '> '.
 */
function normalizeCalloutSyntax(markdown: string): string {
  return markdown.replace(
    /(^|\n)(?!\s*>)\s*(\[?!\s*(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION|CALLOUT|INFO)\]?.*)/gim,
    "$1> $2"
  );
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

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = "",
  onToggleTask,
}) => {
  const { body } = parseFrontmatter(content);
  const normalizedBody = normalizeCalloutSyntax(body);
  const processedMarkdown = processWikilinks(normalizedBody);

  let taskCounter = 0;

  return (
    <div className={`markdown-body prose prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeRaw, rehypeKatex]}
        components={{
          // Interactive GFM Task List Checkboxes
          input({ checked, type, ...props }: any) {
            if (type === "checkbox") {
              const currentTaskIdx = taskCounter++;
              return (
                <input
                  type="checkbox"
                  checked={Boolean(checked)}
                  onChange={(e) => {
                    onToggleTask?.(currentTaskIdx, e.target.checked);
                  }}
                  className="accent-indigo-500 cursor-pointer rounded mr-2"
                  {...props}
                />
              );
            }
            return <input type={type} {...props} />;
          },

          // Custom Callout rendering
          blockquote({ children }) {
            const childrenArray = React.Children.toArray(children);
            const firstElemIdx = childrenArray.findIndex((c) => React.isValidElement(c));

            let calloutType: string | null = null;
            let customTitle: string | null = null;
            let cleanedChildren = children;

            if (firstElemIdx !== -1) {
              const firstElem = childrenArray[firstElemIdx] as React.ReactElement<{ children?: any }>;
              const pChildren = firstElem.props.children;
              let firstText = "";

              if (typeof pChildren === "string") {
                firstText = pChildren;
              } else if (Array.isArray(pChildren) && typeof pChildren[0] === "string") {
                firstText = pChildren[0];
              }

              // Matches: [!NOTE], !note, ! warning, [!warning], [!callout], etc.
              const calloutRegex = /^\s*\[?!\s*(NOTE|TIP|IMPORTANT|WARNING|CAUTION|CALLOUT|INFO)\]?:?\s*(.*)$/i;
              const [firstLine, ...remainingLines] = firstText.split("\n");
              const match = firstLine.match(calloutRegex);

              if (match) {
                let typeKey = match[1].toUpperCase();
                if (typeKey === "INFO" || typeKey === "CALLOUT") typeKey = "NOTE";
                calloutType = typeKey;

                const afterMatch = match[2].trim();
                let restOfParagraph = "";

                if (remainingLines.length > 0) {
                  customTitle = afterMatch || null;
                  restOfParagraph = remainingLines.join("\n").trim();
                } else {
                  // Single line callout, e.g. "> ! warning: check this out" or "> [!NOTE] hello"
                  customTitle = null;
                  restOfParagraph = afterMatch;
                }

                let cleanedFirstElem: React.ReactNode = null;

                if (typeof pChildren === "string") {
                  if (restOfParagraph) {
                    cleanedFirstElem = React.cloneElement(firstElem, {}, restOfParagraph);
                  }
                } else if (Array.isArray(pChildren)) {
                  const newPChildren = [...pChildren];
                  if (restOfParagraph) {
                    newPChildren[0] = restOfParagraph;
                  } else {
                    newPChildren.shift();
                  }
                  if (newPChildren.length > 0) {
                    cleanedFirstElem = React.cloneElement(firstElem, {}, ...newPChildren);
                  }
                }

                const newChildrenList = [...childrenArray];
                if (cleanedFirstElem) {
                  newChildrenList[firstElemIdx] = cleanedFirstElem;
                } else {
                  newChildrenList.splice(firstElemIdx, 1);
                }
                cleanedChildren = newChildrenList;
              }
            }

            if (calloutType) {
              const stylesMap: Record<
                string,
                {
                  bg: string;
                  border: string;
                  icon: React.ComponentType<{ className?: string }>;
                  title: string;
                  titleColor: string;
                  iconBg: string;
                  iconColor: string;
                }
              > = {
                NOTE: {
                  bg: "bg-blue-950/25 border-blue-500/30",
                  border: "border-l-blue-500",
                  icon: Info,
                  title: "Note",
                  titleColor: "text-blue-400",
                  iconBg: "bg-blue-500/20",
                  iconColor: "text-blue-400",
                },
                TIP: {
                  bg: "bg-emerald-950/25 border-emerald-500/30",
                  border: "border-l-emerald-500",
                  icon: Lightbulb,
                  title: "Tip",
                  titleColor: "text-emerald-400",
                  iconBg: "bg-emerald-500/20",
                  iconColor: "text-emerald-400",
                },
                IMPORTANT: {
                  bg: "bg-purple-950/25 border-purple-500/30",
                  border: "border-l-purple-500",
                  icon: Bookmark,
                  title: "Important",
                  titleColor: "text-purple-400",
                  iconBg: "bg-purple-500/20",
                  iconColor: "text-purple-400",
                },
                WARNING: {
                  bg: "bg-amber-950/25 border-amber-500/30",
                  border: "border-l-amber-500",
                  icon: AlertTriangle,
                  title: "Warning",
                  titleColor: "text-amber-400",
                  iconBg: "bg-amber-500/20",
                  iconColor: "text-amber-400",
                },
                CAUTION: {
                  bg: "bg-rose-950/25 border-rose-500/30",
                  border: "border-l-rose-500",
                  icon: ShieldAlert,
                  title: "Caution",
                  titleColor: "text-rose-400",
                  iconBg: "bg-rose-500/20",
                  iconColor: "text-rose-400",
                },
              };

              const style = stylesMap[calloutType] || stylesMap.NOTE;
              const Icon = style.icon;

              return (
                <div
                  className={`my-4 p-4 rounded-xl border border-l-4 ${style.border} ${style.bg} backdrop-blur-md shadow-sm`}
                >
                  <div className="flex items-center gap-2.5 font-semibold text-sm mb-2">
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${style.iconBg} ${style.iconColor}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className={`tracking-wide font-bold ${style.titleColor}`}>
                      {customTitle || style.title}
                    </span>
                  </div>
                  <div className="text-neutral-200 text-sm leading-relaxed prose-p:my-1">
                    {cleanedChildren}
                  </div>
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

          // Custom link renderer for internal wikilinks / routing and web links
          a({ href, children, ...props }: any) {
            let targetHref = href || "";
            if (targetHref.startsWith("www.")) {
              targetHref = `https://${targetHref}`;
            }
            const isInternal = targetHref.startsWith("/") || targetHref.startsWith("#");
            if (isInternal) {
              return (
                <a
                  href={targetHref}
                  className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4 decoration-indigo-500/50 transition-colors font-medium inline-flex items-center gap-1"
                  {...props}
                >
                  {children}
                </a>
              );
            }
            return (
              <a
                href={targetHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 underline underline-offset-4 decoration-indigo-500/50 transition-colors inline-flex items-center gap-1 group/link cursor-pointer"
                title={`Open ${targetHref} in new tab`}
                {...props}
              >
                <span>{children}</span>
                <ExternalLink className="w-3 h-3 opacity-60 group-hover/link:opacity-100 transition-opacity shrink-0 inline" />
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
