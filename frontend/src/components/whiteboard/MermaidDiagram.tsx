import React, { useEffect, useId, useState } from "react";
import mermaid from "mermaid";
import { AlertCircle, Code2, Sparkles } from "lucide-react";

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

interface MermaidDiagramProps {
  definition: string;
  title?: string | null;
  fallbackText?: string | null;
}

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({
  definition,
  title,
  fallbackText,
}) => {
  const reactId = useId().replace(/:/g, "");
  const [svg, setSvg] = useState<string>("");
  const [renderError, setRenderError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setRenderError(null);
        await mermaid.parse(definition);
        const { svg: rendered } = await mermaid.render(`lm_diagram_${reactId}`, definition);
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

  return (
    <div className="rounded-xl border border-slate-800 bg-navy-950/90 p-3.5">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent-violet" />
          <span className="text-xs font-semibold text-slate-200">
            {title || "Concept Diagram"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowRaw((v) => !v)}
          className="inline-flex items-center gap-1 rounded-md border border-slate-700/80 px-2 py-0.5 text-[11px] text-slate-400 hover:text-slate-200"
        >
          <Code2 className="h-3 w-3" />
          {showRaw ? "View Visual" : "View Spec"}
        </button>
      </div>

      {showRaw ? (
        <pre className="overflow-x-auto rounded-lg bg-navy-900 p-3 font-mono text-[11px] text-slate-300">
          {definition}
        </pre>
      ) : renderError ? (
        <div className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
          <div className="flex items-center gap-1.5 font-medium">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>Visual diagram could not be rendered safely; showing text explanation.</span>
          </div>
          {fallbackText && <p className="text-slate-200 leading-relaxed">{fallbackText}</p>}
          <pre className="overflow-x-auto rounded bg-navy-950/80 p-2 font-mono text-[11px] text-slate-400">
            {definition}
          </pre>
        </div>
      ) : svg ? (
        <div
          className="flex justify-center overflow-x-auto py-1 [&_svg]:max-h-[300px] [&_svg]:w-auto"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <p className="py-4 text-center text-xs text-slate-500">Rendering visual...</p>
      )}
    </div>
  );
};
