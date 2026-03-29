import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowUp, Square } from "lucide-react";
import VoiceInput from "@/components/VoiceInput";
import { stopSpeaking } from "@/services/avatarService";

interface ChatInputProps {
  onSend: (query: string) => void;
  onCancel: () => void;
  isLoading: boolean;
  onVoiceListening?: (listening: boolean) => void;
}

export function ChatInput({ onSend, onCancel, isLoading, onVoiceListening }: ChatInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoading) inputRef.current?.focus();
  }, [isLoading]);

  const handleSubmit = () => {
    const q = value.trim();
    if (!q || isLoading) return;
    onSend(q);
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleVoiceTranscript = useCallback((text: string) => {
    stopSpeaking();
    onSend(text);
  }, [onSend]);

  return (
    <div className="bg-background safe-bottom px-4 py-3">
      <div className="max-w-4xl mx-auto relative flex items-center rounded-full border border-border bg-secondary/50 focus-within:ring-2 focus-within:ring-primary/30 transition-shadow">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about your documentation..."
          className="flex-1 h-10 bg-transparent px-4 text-sm focus:outline-none placeholder:text-muted-foreground"
          aria-label="Chat message input"
        />
        <div className="flex items-center gap-2 pr-2">
          <VoiceInput
            onTranscriptReady={handleVoiceTranscript}
            onListeningChange={onVoiceListening}
            disabled={isLoading}
          />
          <button
            onClick={isLoading ? onCancel : handleSubmit}
            disabled={!isLoading && !value.trim()}
            className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 active:scale-95 disabled:opacity-40 ${
              isLoading
                ? "bg-destructive text-destructive-foreground"
                : "bg-primary text-primary-foreground"
            }`}
            aria-label={isLoading ? "Stop generating" : "Send message"}
          >
            {isLoading ? <Square className="h-3.5 w-3.5" /> : <ArrowUp className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
