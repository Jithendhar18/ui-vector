import { useNavigate } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { useChat } from "@/contexts/ChatContext";
import { Button } from "@/components/ui/button";
import { relativeTime } from "@/utils/date";
import { groupByDate } from "@/utils/date";
import type { ChatSession } from "@/features/chat/types";

interface SessionListProps {
  onClose?: () => void;
}

export function SessionList({ onClose }: SessionListProps) {
  const { sessions, activeSessionId, createNewSession, setActiveSession, deleteSession } = useChat();
  const navigate = useNavigate();

  const sorted = [...sessions].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  const grouped = groupByDate<ChatSession>(sorted, (s) => s.updatedAt);

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
                      {session.messageCount ?? session.messages.length} msgs &bull; {relativeTime(session.lastMessageAt ?? session.updatedAt, "No messages")}
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
