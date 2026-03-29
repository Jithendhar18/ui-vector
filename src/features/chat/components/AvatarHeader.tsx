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
  listening: "border-destructive shadow-[0_0_16px_hsl(var(--destructive)/0.3)]",
  processing: "border-warning shadow-[0_0_16px_hsl(var(--warning)/0.3)]",
  generating: "border-warning shadow-[0_0_16px_hsl(var(--warning)/0.3)]",
  speaking: "border-success shadow-[0_0_16px_hsl(var(--success)/0.3)]",
};

export function AvatarHeader({ state }: AvatarHeaderProps) {
  return (
    <div className="flex flex-col items-center pt-6 pb-4">
      <div className="relative">
        {state === "speaking" && (
          <div className="absolute inset-0 rounded-full bg-success/40 animate-pulse-ring" />
        )}

        {(state === "processing" || state === "generating") && (
          <div className="absolute inset-0 rounded-full bg-warning/30 animate-pulse-ring-slow" />
        )}

        <div
          className={`relative rounded-full overflow-hidden w-20 h-20 border-[2.5px] transition-all duration-500 ${BORDER_CLASS[state]}`}
        >
          <img
            src={avatarImage}
            alt="Andino Support"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      <p className="mt-2.5 text-base font-semibold text-foreground">Andino Support</p>
      <p className="text-sm text-muted-foreground">{STATE_SUBTITLE[state]}</p>
    </div>
  );
}
