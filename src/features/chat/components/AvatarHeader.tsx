import type { AvatarState } from "@/services/avatarService";
import avatarImage from "@/assets/avatar-agent.png";

interface AvatarHeaderProps {
  state: AvatarState;
}

const STATE_SUBTITLE: Record<AvatarState, string> = {
  idle: "AI-powered documentation assistant",
  listening: "Listening to you...",
  processing: "Searching your documentation...",
  generating: "Preparing response...",
  speaking: "Reading response aloud...",
};

const BORDER_CLASS: Record<AvatarState, string> = {
  idle: "border-border",
  listening: "border-destructive shadow-[0_0_12px_hsl(var(--destructive)/0.3)]",
  processing: "border-warning shadow-[0_0_12px_hsl(var(--warning)/0.3)]",
  generating: "border-warning shadow-[0_0_12px_hsl(var(--warning)/0.3)]",
  speaking: "border-success shadow-[0_0_12px_hsl(var(--success)/0.3)]",
};

export function AvatarHeader({ state }: AvatarHeaderProps) {
  return (
    <div className="flex flex-col items-center py-4 border-b border-border bg-card/50">
      <div className="relative">
        <div
          className={`rounded-full overflow-hidden w-16 h-16 border-2 transition-all duration-500 ${BORDER_CLASS[state]}`}
        >
          <img
            src={avatarImage}
            alt="Andino Support"
            className="w-full h-full object-cover"
          />
        </div>

        {state === "speaking" && (
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 flex items-end gap-px">
            {[...Array(5)].map((_, i) => (
              <span
                key={i}
                className="w-0.5 bg-success rounded-full"
                style={{
                  height: `${4 + Math.random() * 8}px`,
                  animation: `waveform 0.5s ease-in-out ${i * 0.07}s infinite alternate`,
                }}
              />
            ))}
          </div>
        )}

        {(state === "processing" || state === "generating") && (
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2">
            <div className="h-3 w-3 rounded-full border-[1.5px] border-warning border-t-transparent animate-spin" />
          </div>
        )}
      </div>

      <p className="mt-2 text-sm font-semibold text-foreground">Andino Support</p>
      <p className="text-xs text-muted-foreground">{STATE_SUBTITLE[state]}</p>
    </div>
  );
}
