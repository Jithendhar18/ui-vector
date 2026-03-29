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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isLoading) textareaRef.current?.focus();
  }, [isLoading]);

  const handleSubmit = () => {
    const q = value.trim();
    if (!q || isLoading) return;
    onSend(q);
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  };

  const handleVoiceTranscript = useCallback((text: string) => {
    stopSpeaking();
    onSend(text);
  }, [onSend]);

  return (
    <div className="sticky bottom-0 bg-background pb-4 safe-bottom pt-2 px-4">
      <div className="relative max-w-3xl mx-auto flex items-end gap-2">
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder="Ask anything about your documentation..."
            rows={1}
            className="w-full resize-none rounded-2xl border border-border bg-card px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
            aria-label="Chat message input"
          />
          <button
            onClick={isLoading ? onCancel : handleSubmit}
            disabled={!isLoading && !value.trim()}
            className={`absolute right-3 bottom-3 h-8 w-8 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 disabled:opacity-40 ${
              isLoading
                ? "bg-destructive text-destructive-foreground"
                : "bg-primary text-primary-foreground"
            }`}
            aria-label={isLoading ? "Stop generating" : "Send message"}
          >
            {isLoading ? <Square className="h-3.5 w-3.5" /> : <ArrowUp className="h-4 w-4" />}
          </button>
        </div>
        <VoiceInput
          onTranscriptReady={handleVoiceTranscript}
          onListeningChange={onVoiceListening}
          disabled={isLoading}
        />
      </div>
    </div>
  );
}
