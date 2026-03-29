import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useChat } from "@/contexts/ChatContext";
import * as chatService from "@/services/chat-service";
import { stopSpeaking } from "@/services/avatarService";
import type { AvatarState } from "@/services/avatarService";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { toast } from "sonner";
import { SessionList } from "@/features/chat/components/SessionList";
import { MessageList } from "@/features/chat/components/MessageList";
import { EmptyState } from "@/features/chat/components/EmptyState";
import { ChatInput } from "@/features/chat/components/ChatInput";
import { AvatarHeader } from "@/features/chat/components/AvatarHeader";
import { useChatScroll } from "@/features/chat/hooks/useChatScroll";

export default function ChatPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const {
    sessions,
    activeSession,
    activeSessionId,
    isLoading,
    streamingMessage,
    sendMessage,
    cancelRequest,
    setActiveSession,
    createNewSession,
  } = useChat();

  const [elapsed, setElapsed] = useState(0);
  const [mobileSessionsOpen, setMobileSessionsOpen] = useState(false);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [avatarState, setAvatarState] = useState<AvatarState>("idle");

  const messages = activeSession?.messages ?? [];
  const isEmpty = messages.length === 0 && !streamingMessage && !isLoading;

  const { messagesEndRef, scrollContainerRef, handleScroll } = useChatScroll(
    messages,
    streamingMessage
  );

  const { data: popularQuestions, isLoading: isPopularLoading } = useQuery({
    queryKey: ["chat-popular-questions"],
    queryFn: async () => {
      const result = await chatService.getPopularQuestions(6);
      return result.map((item) => item.query).filter(Boolean);
    },
    staleTime: 120_000,
    retry: 0,
  });

  // Track avatar state from loading
  useEffect(() => {
    setAvatarState(isLoading ? "processing" : "idle");
  }, [isLoading]);

  // Sync URL → state
  useEffect(() => {
    if (sessionId && sessionId !== activeSessionId) {
      const found = sessions.find((s) => s.id === sessionId);
      if (found) {
        setActiveSession(sessionId);
      } else {
        toast.error("Session not found");
        navigate("/chat", { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Elapsed timer for thinking indicator
  useEffect(() => {
    if (!isLoading) {
      setElapsed(0);
      return;
    }
    const start = Date.now();
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [isLoading]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        createNewSession();
        navigate("/chat");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [createNewSession, navigate]);

  // Interrupt avatar speech when user starts voice input
  useEffect(() => {
    if (isVoiceListening) stopSpeaking();
  }, [isVoiceListening]);

  return (
    <div className="flex h-full">
      {/* Desktop session sidebar */}
      <div className="hidden md:flex w-[280px] border-r border-border shrink-0">
        <SessionList />
      </div>

      {/* Mobile session sidebar */}
      <Sheet open={mobileSessionsOpen} onOpenChange={setMobileSessionsOpen}>
        <SheetContent side="left" className="p-0 w-[280px]">
          <SessionList onClose={() => setMobileSessionsOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="md:hidden flex items-center p-2 border-b border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileSessionsOpen(true)}
            aria-label="Open sessions"
          >
            Sessions
          </Button>
        </div>

        <AvatarHeader state={avatarState} />

        {isEmpty ? (
          <div className="flex-1">
            <EmptyState
              onSuggest={(q) => sendMessage(q)}
              suggestions={popularQuestions ?? []}
              isSuggestionsLoading={isPopularLoading}
            />
          </div>
        ) : (
          <MessageList
            messages={messages}
            streamingMessage={streamingMessage}
            elapsed={elapsed}
            onCancel={cancelRequest}
            scrollContainerRef={scrollContainerRef}
            messagesEndRef={messagesEndRef}
            onScroll={handleScroll}
          />
        )}

        <ChatInput
          onSend={sendMessage}
          onCancel={cancelRequest}
          isLoading={isLoading}
          onVoiceListening={setIsVoiceListening}
        />
      </div>

    </div>
  );
}
