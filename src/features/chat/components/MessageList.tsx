import { MessageBubble } from "@/features/chat/components/MessageBubble";
import { ThinkingIndicator } from "@/features/chat/components/ThinkingIndicator";
import type { Message } from "@/features/chat/types";

interface MessageListProps {
  messages: Message[];
  streamingMessage: Message | null;
  elapsed: number;
  onCancel: () => void;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onScroll: () => void;
}

export function MessageList({
  messages,
  streamingMessage,
  elapsed,
  onCancel,
  scrollContainerRef,
  messagesEndRef,
  onScroll,
}: MessageListProps) {
  return (
    <div
      ref={scrollContainerRef}
      onScroll={onScroll}
      className="flex-1 overflow-y-auto scrollbar-thin px-4 py-6"
      style={{ scrollBehavior: "smooth" }}
    >
      <div className="max-w-3xl mx-auto space-y-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {streamingMessage && (
          streamingMessage.content ? (
            <MessageBubble message={streamingMessage} />
          ) : (
            <ThinkingIndicator
              statusLabel={streamingMessage.statusLabel}
              elapsed={elapsed}
              onCancel={onCancel}
            />
          )
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
