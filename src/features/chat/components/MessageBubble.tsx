import { useState, useCallback, memo } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import rehypeHighlight from "rehype-highlight";
import { Copy, Check, Volume2, VolumeX } from "lucide-react";
import { SourcePanel } from "@/features/chat/components/SourcePanel";
import { stripMarkdown } from "@/utils/text";
import type { Message } from "@/features/chat/types";

interface MessageBubbleProps {
  message: Message;
  onSpeak?: (messageId: string, plainText: string) => void;
  isSpeaking?: boolean;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  onSpeak,
  isSpeaking,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [message.content]);

  const handleSpeak = useCallback(() => {
    onSpeak?.(message.id, stripMarkdown(message.content));
  }, [message.id, message.content, onSpeak]);

  if (message.role === "user") {
    return (
      <div className="flex justify-end animate-fade-in">
        <div className="max-w-[58%] max-sm:max-w-[85%] rounded-[14px_14px_3px_14px] bg-primary text-primary-foreground px-[14px] py-[9px] text-sm leading-relaxed">
          {message.content}
        </div>
      </div>
    );
  }

  if (message.role === "error") {
    return (
      <div className="flex animate-fade-in">
        <div className="max-w-[78%] max-sm:max-w-[90%] rounded-[3px_14px_14px_14px] border border-destructive/30 bg-destructive/10 px-[14px] py-[11px] text-sm leading-relaxed">
          <p className="text-destructive">{message.content}</p>
        </div>
      </div>
    );
  }

  if (message.status === "cancelled") {
    return (
      <div className="flex animate-fade-in">
        <div className="max-w-[78%] max-sm:max-w-[90%] rounded-[3px_14px_14px_14px] bg-card border border-border px-[14px] py-[11px] text-sm leading-relaxed text-muted-foreground italic">
          Request cancelled
        </div>
      </div>
    );
  }

  const isCompleted = message.status === "done";

  return (
    <div className="flex group animate-fade-in" role="log" aria-live="polite">
      <div className="max-w-[78%] max-sm:max-w-[90%]">
        <div className="rounded-[3px_14px_14px_14px] bg-card border border-border px-[14px] py-[11px] text-sm leading-relaxed">
          <div className="markdown-content">
            <ReactMarkdown
              rehypePlugins={[rehypeSanitize, rehypeHighlight]}
              components={{
                a: ({ ...props }) => (
                  <a {...props} target="_blank" rel="noopener noreferrer" />
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>

          {message.sources && <SourcePanel sources={message.sources} />}

          {message.latency_ms != null && (
            <p className="mt-1 text-[10px] text-muted-foreground">
              {(message.latency_ms / 1000).toFixed(1)}s
            </p>
          )}
        </div>

        {isCompleted && (
          <div className="flex items-center gap-1 mt-1.5 ml-1 opacity-0 group-hover:opacity-100 max-sm:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label="Copy response"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            {onSpeak && (
              <button
                onClick={handleSpeak}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                aria-label={isSpeaking ? "Stop speaking" : "Read aloud"}
              >
                {isSpeaking
                  ? <VolumeX className="h-3.5 w-3.5 text-success" />
                  : <Volume2 className="h-3.5 w-3.5" />
                }
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
