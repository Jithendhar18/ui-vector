import { useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink, FileText } from "lucide-react";
import type { SourceDocument } from "@/features/chat/types";

function SourceChip({ source }: { source: SourceDocument }) {
  if (source.source_url) {
    return (
      <a
        href={source.source_url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1 text-xs font-medium text-primary hover:bg-secondary/80 transition-colors truncate max-w-[240px]"
      >
        <span className="truncate">{source.document_title}</span>
        <ExternalLink className="h-3 w-3 shrink-0" />
      </a>
    );
  }
  return (
    <span className="inline-flex items-center rounded-lg bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground truncate max-w-[240px]">
      {source.document_title}
    </span>
  );
}

export function SourcePanel({ sources }: { sources: SourceDocument[] }) {
  const [expanded, setExpanded] = useState(false);
  if (!sources.length) return null;

  const seen = new Set<string>();
  const unique = sources.filter((s) => {
    const key = s.document_title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return (
    <div className="mt-2 border-t border-border pt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        aria-expanded={expanded}
        aria-label={`${unique.length} sources`}
      >
        <FileText className="h-3 w-3" />
        {unique.length} source{unique.length !== 1 ? "s" : ""}
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
      {expanded && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {unique.map((s) => (
            <SourceChip key={s.chunk_id} source={s} />
          ))}
        </div>
      )}
    </div>
  );
}
