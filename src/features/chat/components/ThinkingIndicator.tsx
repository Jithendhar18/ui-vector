interface ThinkingIndicatorProps {
  statusLabel?: string;
  elapsed: number;
  onCancel: () => void;
}

export function ThinkingIndicator({ statusLabel, elapsed, onCancel }: ThinkingIndicatorProps) {
  return (
    <div className="flex items-start gap-3 max-w-[70%] md:max-w-[70%] animate-fade-in">
      <div className="rounded-2xl rounded-bl-md bg-card border border-border px-4 py-3">
        <div className="flex gap-1.5 mb-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className="thinking-dot h-2 w-2 rounded-full bg-primary/60 inline-block" />
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {elapsed >= 30
            ? "Still working on it..."
            : elapsed >= 15
            ? "Still thinking... This is taking longer than usual."
            : statusLabel || "Thinking..."}
        </p>
        {elapsed >= 30 && (
          <button
            onClick={onCancel}
            className="text-xs text-muted-foreground hover:text-foreground mt-1 underline"
          >
            Cancel request
          </button>
        )}
      </div>
    </div>
  );
}
