import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useChat } from "@/contexts/ChatContext";
import * as chatService from "@/services/chat-service";
import { speak, stopSpeaking, isSpeaking } from "@/services/avatarService";
import type { AvatarState } from "@/services/avatarService";
import { toast } from "sonner";
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
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [avatarState, setAvatarState] = useState<AvatarState>("idle");
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  const messages = activeSession?.messages ?? [];
  const isEmpty = messages.length === 0 && !streamingMessage && !isLoading;

  const { messagesEndRef, scrollContainerRef, handleScroll } = useChatScroll(
    messages,
    streamingMessage,
    isLoading
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

  // Derive avatar state from system activity
  useEffect(() => {
    // TTS speaking takes priority
    if (speakingMessageId) return;

    // Voice input
    if (isVoiceListening) {
      setAvatarState("listening");
      return;
    }

    // Streaming — map node labels to avatar states
    if (isLoading && streamingMessage) {
      const label = streamingMessage.statusLabel ?? "";
      const isSearching =
        label.includes("Searching") ||
        label.includes("Ranking") ||
        label.includes("Preparing") ||
        label.includes("Generating") ||
        label.includes("Checking") ||
        label.includes("Finalizing");
      setAvatarState(isSearching ? "generating" : "processing");
      return;
    }

    // Loading but no stream yet (initial thinking)
    if (isLoading) {
      setAvatarState("processing");
      return;
    }

    // Check if last message was an error
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.status === "error") {
      setAvatarState("error");
      // Return to idle after 3 seconds
      const timer = setTimeout(() => setAvatarState("idle"), 3000);
      return () => clearTimeout(timer);
    }

    setAvatarState("idle");
  }, [isLoading, streamingMessage, streamingMessage?.statusLabel, speakingMessageId, isVoiceListening, messages]);

  const handleSpeak = useCallback((messageId: string, plainText: string) => {
    if (speakingMessageId === messageId && isSpeaking()) {
      stopSpeaking();
      setSpeakingMessageId(null);
      setAvatarState("idle");
      return;
    }
    setSpeakingMessageId(messageId);
    speak(plainText, {
      onStateChange: (state) => {
        setAvatarState(state);
        if (state === "idle") setSpeakingMessageId(null);
      },
    }).catch(() => {
      setSpeakingMessageId(null);
      setAvatarState("idle");
    });
  }, [speakingMessageId]);

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
      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        <AvatarHeader state={avatarState} hasMessages={messages.length > 0} messageCount={messages.length} />

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
            onSpeak={handleSpeak}
            speakingMessageId={speakingMessageId}
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
