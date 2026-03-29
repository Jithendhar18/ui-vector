import { BookOpen } from "lucide-react";

interface EmptyStateProps {
  onSuggest: (query: string) => void;
  suggestions: string[];
  isSuggestionsLoading: boolean;
}

export function EmptyState({ onSuggest, suggestions, isSuggestionsLoading }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 px-4">
      <BookOpen className="h-12 w-12 text-muted-foreground/40" />
      <h2 className="text-2xl font-semibold text-foreground">How can I help you today?</h2>
      {isSuggestionsLoading ? (
        <p className="text-sm text-muted-foreground">Loading popular questions...</p>
      ) : suggestions.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => onSuggest(s)}
              className="rounded-2xl border border-border hover:border-primary/50 bg-card px-4 py-3 text-sm text-left transition-colors duration-200 hover:shadow-sm active:scale-[0.98]"
            >
              {s}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Start by asking a question about your docs.</p>
      )}
    </div>
  );
}
