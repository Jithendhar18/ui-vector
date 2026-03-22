import { useState, useCallback, useEffect, useRef } from "react";
import {
  Volume2,
  VolumeX,
  RotateCcw,
  Eye,
  EyeOff,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  speak,
  stopSpeaking,
  replayLastResponse,
  getLastSpokenText,
  isTTSSupported,
  type AvatarState,
} from "@/services/avatarService";
import avatarImage from "@/assets/avatar-agent.png";

interface AvatarPanelProps {
  lastAssistantMessage?: string;
  isProcessing?: boolean;
  onInterrupt?: () => void;
}

export default function AvatarPanel({
  lastAssistantMessage,
  isProcessing,
  onInterrupt,
}: AvatarPanelProps) {
  const [state, setState] = useState<AvatarState>("idle");
  const [muted, setMuted] = useState(false);
  const [visible, setVisible] = useState(true);
  const [wordIndex, setWordIndex] = useState(0);
  const lastSpokenRef = useRef("");
  const ttsSupported = isTTSSupported();

  const stateChangeHandler = useCallback((newState: AvatarState) => {
    setState(newState);
  }, []);

  const avatarOptions = {
    onStateChange: stateChangeHandler,
    onWordBoundary: (charIndex: number) => setWordIndex(charIndex),
    rate: 1.0,
    pitch: 1.0,
  };

  // Auto-speak new assistant messages
  useEffect(() => {
    if (
      lastAssistantMessage &&
      lastAssistantMessage !== lastSpokenRef.current &&
      !muted &&
      ttsSupported
    ) {
      lastSpokenRef.current = lastAssistantMessage;
      speak(lastAssistantMessage, avatarOptions).catch(() => {
        // TTS failed silently
      });
    }
  }, [lastAssistantMessage, muted, ttsSupported]);

  // Update state when processing
  useEffect(() => {
    if (isProcessing) {
      setState("processing");
    } else if (state === "processing") {
      setState("idle");
    }
  }, [isProcessing]);

  const handleStop = useCallback(() => {
    stopSpeaking();
    setState("idle");
    onInterrupt?.();
  }, [onInterrupt]);

  const handleReplay = useCallback(() => {
    if (getLastSpokenText() && !muted) {
      replayLastResponse(avatarOptions).catch(() => {});
    }
  }, [muted]);

  const handleMuteToggle = useCallback(() => {
    const newMuted = !muted;
    setMuted(newMuted);
    if (newMuted) {
      stopSpeaking();
      setState("idle");
    }
  }, [muted]);

  if (!visible) {
    return (
      <div className="flex items-start p-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setVisible(true)}
          className="h-8 w-8 rounded-full"
          aria-label="Show avatar"
        >
          <Eye className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  const stateLabel: Record<AvatarState, string> = {
    idle: "Ready",
    listening: "Listening…",
    processing: "Thinking…",
    generating: "Preparing voice…",
    speaking: "Speaking…",
  };

  const stateColor: Record<AvatarState, string> = {
    idle: "bg-muted",
    listening: "bg-destructive",
    processing: "bg-warning",
    generating: "bg-accent",
    speaking: "bg-success",
  };

  return (
    <div className="w-[280px] border-l border-border bg-card flex flex-col shrink-0 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${stateColor[state]} ${
              state === "speaking" || state === "listening"
                ? "animate-pulse"
                : ""
            }`}
          />
          <span className="text-xs text-muted-foreground font-medium">
            {stateLabel[state]}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setVisible(false)}
          className="h-7 w-7 rounded-full"
          aria-label="Hide avatar"
        >
          <EyeOff className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Avatar image */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="relative">
          <div
            className={`rounded-full overflow-hidden w-48 h-48 border-4 transition-all duration-500 ${
              state === "speaking"
                ? "border-success shadow-[0_0_24px_hsl(var(--success)/0.3)]"
                : state === "listening"
                ? "border-destructive shadow-[0_0_24px_hsl(var(--destructive)/0.3)]"
                : state === "processing" || state === "generating"
                ? "border-warning shadow-[0_0_24px_hsl(var(--warning)/0.3)]"
                : "border-border"
            }`}
          >
            <img
              src={avatarImage}
              alt="AI Assistant"
              className={`w-full h-full object-cover transition-transform duration-300 ${
                state === "speaking" ? "scale-105" : ""
              }`}
            />
          </div>

          {/* Speaking waveform animation */}
          {state === "speaking" && (
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex items-end gap-0.5">
              {[...Array(7)].map((_, i) => (
                <span
                  key={i}
                  className="w-1 bg-success rounded-full"
                  style={{
                    height: `${8 + Math.random() * 16}px`,
                    animation: `waveform 0.5s ease-in-out ${i * 0.07}s infinite alternate`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Processing spinner */}
          {(state === "processing" || state === "generating") && (
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
              <div className="h-5 w-5 rounded-full border-2 border-warning border-t-transparent animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="p-3 border-t border-border flex items-center justify-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleMuteToggle}
          className="h-8 w-8 rounded-full"
          aria-label={muted ? "Unmute" : "Mute"}
        >
          {muted ? (
            <VolumeX className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </Button>

        {state === "speaking" && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleStop}
            className="h-8 w-8 rounded-full"
            aria-label="Stop speaking"
          >
            <Square className="h-3.5 w-3.5 text-destructive" />
          </Button>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={handleReplay}
          disabled={!getLastSpokenText() || state === "speaking" || muted}
          className="h-8 w-8 rounded-full"
          aria-label="Replay last response"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
