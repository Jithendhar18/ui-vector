import { useState, useRef, useEffect, useCallback, memo, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ChatSession } from "@/types";
import { useParams, useNavigate } from "react-router-dom";
import { useChat } from "@/contexts/ChatContext";
import { queryApi } from "@/lib/query-api";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import rehypeHighlight from "rehype-highlight";
import {
  BookOpen,
  Plus,
  ArrowUp,
  Square,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Trash2,
  FileText,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { toast } from "sonner";
import type { Message, SourceDocument } from "@/types";
import VoiceInput from "@/components/VoiceInput";
import AvatarPanel from "@/components/AvatarPanel";
import { stopSpeaking } from "@/services/avatarService";

// Source panel — show top sources as simple links
function SourcePanel({ sources }: { sources: SourceDocument[] }) {
  const [expanded, setExpanded] = useState(false);
  if (!sources.length) return null;

  // Deduplicate by title (same page can appear from multiple chunks)
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

function formatSessionTime(value?: string | null): string {
  if (!value) return "No messages";
  const date = new Date(value);
  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

// Thinking indicator
function ThinkingIndicator({
  statusLabel,
  elapsed,
  onCancel,
}: {
  statusLabel?: string;
  elapsed: number;
  onCancel: () => void;
}) {
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

// Message bubble
const MessageBubble = memo(function MessageBubble({ message }: { message: Message }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [message.content]);

  if (message.role === "user") {
    return (
      <div className="flex justify-end animate-fade-in">
        <div className="max-w-[70%] sm:max-w-[70%] max-sm:max-w-[90%] rounded-2xl rounded-br-md bg-primary text-primary-foreground px-4 py-3 text-sm">
          {message.content}
        </div>
      </div>
    );
  }

  if (message.role === "error") {
    return (
      <div className="flex animate-fade-in">
        <div className="max-w-[70%] sm:max-w-[70%] max-sm:max-w-[90%] rounded-2xl rounded-bl-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">
          <p className="text-destructive">{message.content}</p>
        </div>
      </div>
    );
  }

  if (message.status === "cancelled") {
    return (
      <div className="flex animate-fade-in">
        <div className="max-w-[70%] rounded-2xl rounded-bl-md bg-card border border-border px-4 py-3 text-sm text-muted-foreground italic">
          Request cancelled
        </div>
      </div>
    );
  }

  return (
    <div className="flex group animate-fade-in" role="log" aria-live="polite">
      <div className="relative max-w-[70%] sm:max-w-[70%] max-sm:max-w-[90%] rounded-2xl rounded-bl-md bg-card border border-border px-4 py-3 text-sm">
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 max-sm:opacity-100 transition-opacity p-1 rounded-lg hover:bg-secondary"
          aria-label="Copy response"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
        </button>

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
          <p className="mt-1 text-[11px] text-muted-foreground">
            {(message.latency_ms / 1000).toFixed(1)}s
          </p>
        )}
      </div>
    </div>
  );
});

// Suggestion cards
function EmptyState({
  onSuggest,
  suggestions,
  isSuggestionsLoading,
}: {
  onSuggest: (q: string) => void;
  suggestions: string[];
  isSuggestionsLoading: boolean;
}) {
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

// Session sidebar
function SessionList({
  onClose,
}: {
  onClose?: () => void;
}) {
  const { sessions, activeSessionId, createNewSession, setActiveSession, deleteSession } = useChat();
  const navigate = useNavigate();

  const grouped = groupSessionsByDate(sessions);

  const handleNew = () => {
    createNewSession();
    navigate("/chat");
    onClose?.();
  };

  const handleSelect = (id: string) => {
    setActiveSession(id);
    navigate(`/chat/${id}`);
    onClose?.();
  };

  return (
    <div className="flex flex-col h-full bg-sidebar">
      <div className="p-3">
        <Button
          onClick={handleNew}
          className="w-full rounded-xl gap-2"
          aria-label="New chat"
        >
          <Plus className="h-4 w-4" /> New Chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 pb-3">
        {sessions.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground mt-8">No conversations yet</p>
        ) : (
          Object.entries(grouped).map(([label, items]) => (
            <div key={label} className="mb-3">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-2 mb-1">
                {label}
              </p>
              {items.map((session) => (
                <div
                  key={session.id}
                  className={`group flex items-center gap-2 px-2 py-2 rounded-xl cursor-pointer transition-colors text-sm ${
                    session.id === activeSessionId
                      ? "bg-primary/10 text-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  }`}
                  onClick={() => handleSelect(session.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && handleSelect(session.id)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate">{session.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {session.messageCount ?? session.messages.length} msgs • {formatSessionTime(session.lastMessageAt ?? session.updatedAt)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void deleteSession(session.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                    aria-label="Delete session"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function groupSessionsByDate(sessions: ChatSession[]): Record<string, ChatSession[]> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const week = new Date(today.getTime() - 7 * 86400000);

  const groups: Record<string, ChatSession[]> = {};
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  for (const s of sorted) {
    const d = new Date(s.updatedAt);
    let label: string;
    if (d >= today) label = "Today";
    else if (d >= yesterday) label = "Yesterday";
    else if (d >= week) label = "Previous 7 Days";
    else label = "Older";
    if (!groups[label]) groups[label] = [];
    groups[label].push(s);
  }
  return groups;
}

// Chat input
function ChatInput({
  onSend,
  onCancel,
  isLoading,
  onVoiceListening,
}: {
  onSend: (q: string) => void;
  onCancel: () => void;
  isLoading: boolean;
  onVoiceListening?: (listening: boolean) => void;
}) {
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
    // Interrupt AI speech when user starts talking
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

// Main chat page
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [userScrolledUp, setUserScrolledUp] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [mobileSessionsOpen, setMobileSessionsOpen] = useState(false);
  const [isVoiceListening, setIsVoiceListening] = useState(false);

  const { data: popularQuestions, isLoading: isPopularLoading } = useQuery({
    queryKey: ["chat-popular-questions"],
    queryFn: async () => {
      const result = await queryApi.getPopularQuestions(6);
      return result.map((item) => item.query).filter(Boolean);
    },
    staleTime: 120000,
    retry: 0,
  });

  // Get the last assistant message for TTS
  const lastAssistantMessage = useMemo(() => {
    const msgs = activeSession?.messages ?? [];
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === "assistant" && msgs[i].status === "done") {
        return msgs[i].content;
      }
    }
    return undefined;
  }, [activeSession?.messages]);

  // Sync URL to state
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
  }, [sessionId]);

  // Auto-scroll
  useEffect(() => {
    if (!userScrolledUp) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeSession?.messages, streamingMessage, userScrolledUp]);

  // Track scroll
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const fromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setUserScrolledUp(fromBottom > 100);
  }, []);

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
    if (isVoiceListening) {
      stopSpeaking();
    }
  }, [isVoiceListening]);

  const messages = activeSession?.messages ?? [];
  const isEmpty = messages.length === 0 && !streamingMessage && !isLoading;

  return (
    <div className="flex h-full">
      {/* Desktop session sidebar */}
      <div className="hidden md:flex w-[280px] border-r border-border shrink-0">
        <SessionList />
      </div>

      {/* Mobile session sidebar trigger */}
      <Sheet open={mobileSessionsOpen} onOpenChange={setMobileSessionsOpen}>
        <SheetContent side="left" className="p-0 w-[280px]">
          <SessionList onClose={() => setMobileSessionsOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar with session toggle */}
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

        {isEmpty ? (
          <div className="flex-1">
            <EmptyState
              onSuggest={(q) => sendMessage(q)}
              suggestions={popularQuestions ?? []}
              isSuggestionsLoading={isPopularLoading}
            />
          </div>
        ) : (
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
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
                    onCancel={cancelRequest}
                  />
                )
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        <ChatInput
          onSend={sendMessage}
          onCancel={cancelRequest}
          isLoading={isLoading}
          onVoiceListening={setIsVoiceListening}
        />
      </div>

      {/* Avatar side panel — desktop only */}
      <div className="hidden lg:flex">
        <AvatarPanel
          lastAssistantMessage={lastAssistantMessage}
          isProcessing={isLoading}
          onInterrupt={cancelRequest}
        />
      </div>
    </div>
  );
}
