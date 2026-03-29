import { useRef, useState, useCallback, useEffect } from "react";
import type { Message } from "@/features/chat/types";

export function useChatScroll(
  messages: Message[],
  streamingMessage: Message | null
) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [userScrolledUp, setUserScrolledUp] = useState(false);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setUserScrolledUp(fromBottom > 100);
  }, []);

  useEffect(() => {
    if (!userScrolledUp) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamingMessage, userScrolledUp]);

  return { messagesEndRef, scrollContainerRef, userScrolledUp, handleScroll };
}
