import React, { useEffect, useId, useState } from "react";
import mermaid from "mermaid";
import {
  Check,
  Code2,
  Copy,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sparkles,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  securityLevel: "strict",
  themeVariables: {
    darkMode: true,
    background: "#070b14",
    primaryColor: "#1e3a8a",
    primaryTextColor: "#f1f5f9",
    primaryBorderColor: "#3b82f6",
    lineColor: "#14b8a6",
    secondaryColor: "#11182b",
    tertiaryColor: "#1e293b",
  },
});

/**
 * Robust client-side auto-repair for LLM-generated Mermaid diagrams:
 * 1. Discards conversational preamble preceding diagram keywords (flowchart, graph, etc.)
 * 2. Normalizes unicode arrow variants (⟶, →, ⟹) into standard ASCII arrows (-->).
 * 3. Encloses unquoted node labels with parentheses or operators into double quotes.
 */
function cleanAndRepairMermaid(raw: string): string {
  if (!raw) return "";
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```(?:mermaid)?\s*/i, "").replace(/\s*```$/, "").trim();

  const prefixes = [
    "flowchart",
    "graph",
    "sequenceDiagram",
    "stateDiagram-v2",
    "stateDiagram",
    "classDiagram",
    "erDiagram",
    "mindmap",
    "timeline",
  ];

  const lines = cleaned.split("\n");
  let startIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (prefixes.some((p) => trimmed.startsWith(p))) {
      startIdx = i;
      break;
    }
  }

  const diagramLines = startIdx >= 0 ? lines.slice(startIdx) : ["graph TD", ...lines];

  return diagramLines
    .map((line) => {
      // 1. Replace unicode arrows with ASCII arrows, and normalize single -> to -->
      let l = line
        .replace(/[\u2192\u27F6\u2794\u279C]/g, "-->")
        .replace(/[\u21D2\u27F9]/g, "==>")
        .replace(/[\u2190\u27F5]/g, "<--")
        .replace(/(?<!-)->(?!>)/g, "-->");

      // 2. Wrap unquoted node labels with parentheses, symbols, or operators in double quotes
      l = l.replace(/(\b[A-Za-z0-9_-]+)\[([^"\n\]]+)\]/g, (match, nodeId, content) => {
        const trimmed = content.trim();
        if (
          (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
          (trimmed.startsWith("'") && trimmed.endsWith("'"))
        ) {
          return `${nodeId}[${trimmed}]`;
        }
        if (!/^[A-Za-z0-9_ ]+$/.test(trimmed)) {
          const escaped = trimmed.replace(/"/g, "'");
          return `${nodeId}["${escaped}"]`;
        }
        return match;
      });

      // 3. Wrap unquoted edge pipe labels in double quotes
      l = l.replace(/(-->|==>|<--)\|([^"|\n]+)\|/g, (match, arrow, edgeText) => {
        const trimmed = edgeText.trim();
        if (
          (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
          (trimmed.startsWith("'") && trimmed.endsWith("'"))
        ) {
          return `${arrow}|${trimmed}|`;
        }
        if (!/^[A-Za-z0-9_ ]+$/.test(trimmed)) {
          const escaped = trimmed.replace(/"/g, "'");
          return `${arrow}|"${escaped}"|`;
        }
        return match;
      });

      return l;
    })
    .join("\n")
    .trim();
}

/**
 * Extracts step lines for a structured fallback card view when syntax is unrecoverable
 */
function extractStepFallback(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("graph") && !l.startsWith("flowchart"));
}

interface MermaidDiagramProps {
  definition: string;
  title?: string | null;
  fallbackText?: string | null;
  compact?: boolean;
}

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({
  definition,
  title,
  fallbackText,
  compact = false,
}) => {
  const reactId = useId().replace(/:/g, "");
  const [svg, setSvg] = useState<string>("");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    const sanitized = cleanAndRepairMermaid(definition);

    (async () => {
      try {
        setRenderError(null);
        await mermaid.parse(sanitized);
        const uniqueRenderId = `lm_diag_${reactId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const { svg: rendered } = await mermaid.render(uniqueRenderId, sanitized);
        if (!cancelled) {
          setSvg(rendered);
        }
      } catch (err) {
        if (!cancelled) {
          setSvg("");
          setRenderError(
            err instanceof Error ? err.message : "Diagram syntax could not be rendered."
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [definition, reactId]);

  const handleCopySpec = () => {
    navigator.clipboard.writeText(definition).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 0.25, 2.0));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 0.25, 0.6));
  const handleResetZoom = () => setZoomLevel(1);

  const fallbackSteps = extractStepFallback(definition);

  return (
    <div
      className={`rounded-xl border border-slate-800 bg-navy-950/95 transition-all ${
        compact ? "p-2.5" : "p-4"
      } ${isExpanded ? "fixed inset-4 z-50 overflow-auto bg-navy-950/98 shadow-2xl p-6" : ""}`}
    >
      {/* Header Bar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent-violet animate-pulse" />
          <span className="text-xs font-semibold text-slate-200">
            {title || "Illustrative Concept Whiteboard"}
          </span>
          {svg && (
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
              Interactive Diagram
            </span>
          )}
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-1.5">
          {svg && (
            <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-navy-900/80 px-1 py-0.5 text-[11px] text-slate-300">
              <button
                type="button"
                onClick={handleZoomOut}
                title="Zoom Out"
                className="rounded p-1 hover:bg-slate-800 hover:text-white"
              >
                <ZoomOut className="h-3 w-3" />
              </button>
              <span className="px-1 font-mono text-[10px] text-slate-400">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                onClick={handleZoomIn}
                title="Zoom In"
                className="rounded p-1 hover:bg-slate-800 hover:text-white"
              >
                <ZoomIn className="h-3 w-3" />
              </button>
              {zoomLevel !== 1 && (
                <button
                  type="button"
                  onClick={handleResetZoom}
                  title="Reset Zoom"
                  className="rounded p-1 hover:bg-slate-800 hover:text-white text-slate-400"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={handleCopySpec}
            title="Copy Diagram Code"
            className="inline-flex items-center gap-1 rounded-md border border-slate-700/80 px-2 py-1 text-[11px] text-slate-400 hover:text-slate-200"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowRaw((v) => !v)}
            className="inline-flex items-center gap-1 rounded-md border border-slate-700/80 px-2 py-1 text-[11px] text-slate-400 hover:text-slate-200"
          >
            <Code2 className="h-3 w-3" />
            <span>{showRaw ? "Visual" : "Spec"}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded((e) => !e)}
            title={isExpanded ? "Close Expanded View" : "Full Whiteboard View"}
            className="rounded-md border border-slate-700/80 p-1 text-slate-400 hover:text-slate-200"
          >
            {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Canvas View */}
      {showRaw ? (
        <pre className="overflow-x-auto rounded-lg bg-navy-900 p-3.5 font-mono text-[11px] text-slate-300 leading-relaxed">
          {definition}
        </pre>
      ) : renderError ? (
        <div className="space-y-3 rounded-lg border border-indigo-500/30 bg-navy-900/60 p-4 text-xs">
          <div className="flex items-center gap-2 text-slate-300 font-medium">
            <Sparkles className="h-4 w-4 text-indigo-400 shrink-0" />
            <span>Concept Flow Steps:</span>
          </div>

          {fallbackText && <p className="text-slate-200 leading-relaxed">{fallbackText}</p>}

          {/* Visual Step Cards */}
          <div className="space-y-2 pt-1">
            {fallbackSteps.map((step, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 rounded-lg border border-slate-800 bg-navy-950/80 px-3 py-2 text-slate-200 font-mono text-[11px]"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-[10px] font-bold text-indigo-300">
                  {idx + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </div>
            ))}
          </div>
        </div>
      ) : svg ? (
        <div className="w-full flex justify-center overflow-x-auto py-2 min-h-[220px]">
          <div
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: "top center" }}
            className="w-full max-w-3xl flex justify-center transition-transform duration-150 [&_svg]:w-full [&_svg]:h-auto [&_svg]:max-h-[440px] [&_svg]:block [&_svg]:mx-auto"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center text-slate-500 text-xs">
          <Sparkles className="mb-2 h-5 w-5 animate-spin text-accent-violet" />
          <span>Rendering whiteboard illustration...</span>
        </div>
      )}
    </div>
  );
};
