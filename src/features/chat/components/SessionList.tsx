import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { useChat } from "@/contexts/ChatContext";
import { relativeTime } from "@/utils/date";
import { groupByDate } from "@/utils/date";
import type { ChatSession } from "@/features/chat/types";

interface SessionListProps {
  onClose?: () => void;
}

export function SessionList({ onClose }: SessionListProps) {
  const { sessions, activeSessionId, setActiveSession, deleteSession } = useChat();
  const navigate = useNavigate();

  const sorted = [...sessions].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  const grouped = groupByDate<ChatSession>(sorted, (s) => s.updatedAt);

  const handleSelect = (id: string) => {
    setActiveSession(id);
    navigate(`/chat/${id}`);
    onClose?.();
  };

  return (
    <div className="flex flex-col h-full bg-sidebar">
      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-2">
        {sessions.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground mt-8">No conversations yet</p>
        ) : (
          Object.entries(grouped).map(([label, items]) => (
            <div key={label} className="mb-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-2.5 mb-1">
                {label}
              </p>
              {items.map((session) => (
                <div
                  key={session.id}
                  className={`group flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
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
                    <p className="truncate text-sm">{session.title}</p>
                    <p className="text-xs text-muted-foreground">
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
                    <Trash2 className="h-3.5 w-3.5" />
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
