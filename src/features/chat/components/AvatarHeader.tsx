import { useRef, useEffect, useState, useCallback } from "react";
import type { AvatarState } from "@/services/avatarService";

import wavingVideo from "@/assets/animations/AI_Robot_waving_HI.mp4";
import jumpingVideo from "@/assets/animations/AI_Robot_jumping.mp4";
import readingVideo from "@/assets/animations/AI_Robot_reading_book.mp4";
import pointingVideo from "@/assets/animations/AI_Robot_pointing.mp4";
import tellingNoVideo from "@/assets/animations/AI_Robot_telling_no.mp4";
import surfingVideo from "@/assets/animations/AI_Robot_surfing.mp4";
import fishingVideo from "@/assets/animations/AI_Robot_fishing.mp4";
import yawningVideo from "@/assets/animations/AI_robot_yawning.mp4";

interface AvatarHeaderProps {
  state: AvatarState;
  hasMessages?: boolean;
  messageCount?: number;
}

type IdlePhase = "waving" | "yawning" | "surfing" | "fishing" | "jumping";

const IDLE_VIDEOS: Record<IdlePhase, string> = {
  waving: wavingVideo,
  yawning: yawningVideo,
  surfing: surfingVideo,
  fishing: fishingVideo,
  jumping: jumpingVideo,
};

const ACTIVE_STATE_VIDEO: Partial<Record<AvatarState, string>> = {
  listening: wavingVideo,
  processing: readingVideo,
  generating: readingVideo,
  speaking: pointingVideo,
  error: tellingNoVideo,
};

const NO_MESSAGES_PHASES: IdlePhase[] = ["waving", "yawning"];
const HAS_MESSAGES_PHASES: IdlePhase[] = ["surfing", "fishing"];

const STATE_SUBTITLE: Record<AvatarState, string> = {
  idle: "How can I help you today?",
  listening: "Listening...",
  processing: "Thinking...",
  generating: "Searching your docs...",
  speaking: "Reading answer aloud...",
  error: "Oops! Something went wrong",
};

const IDLE_PHASE_SUBTITLE: Record<IdlePhase, string> = {
  waving: "How can I help you today?",
  yawning: "Still here... just resting my circuits",
  surfing: "Catching waves while you read",
  fishing: "Fishing for your next question",
  jumping: "Ask me anything else!",
};

const BORDER_CLASS: Record<AvatarState, string> = {
  idle: "border-border",
  listening: "border-primary shadow-[0_0_16px_hsl(var(--primary)/0.3)]",
  processing: "border-warning shadow-[0_0_16px_hsl(var(--warning)/0.3)]",
  generating: "border-warning shadow-[0_0_16px_hsl(var(--warning)/0.3)]",
  speaking: "border-success shadow-[0_0_16px_hsl(var(--success)/0.3)]",
  error: "border-destructive shadow-[0_0_16px_hsl(var(--destructive)/0.3)]",
};

function pickRandom(phases: IdlePhase[], exclude?: IdlePhase): IdlePhase {
  const options = exclude ? phases.filter((p) => p !== exclude) : phases;
  return options[Math.floor(Math.random() * options.length)];
}

function randomInterval(): number {
  return 8_000 + Math.random() * 17_000; // 8–25s
}

const FADE_MS = 500;

function playVideo(video: HTMLVideoElement, src: string, slow: boolean) {
  video.src = src;
  video.load();
  video.play().then(() => {
    video.playbackRate = slow ? 0.75 : 1;
  }).catch(() => {});
}

export function AvatarHeader({ state, hasMessages, messageCount = 0 }: AvatarHeaderProps) {
  const videoRef0 = useRef<HTMLVideoElement>(null);
  const videoRef1 = useRef<HTMLVideoElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [idlePhase, setIdlePhase] = useState<IdlePhase>("waving");
  const prevSrcRef = useRef<string>("");

  const getVideoSrc = useCallback(() => {
    if (state !== "idle") return ACTIVE_STATE_VIDEO[state] ?? wavingVideo;
    return IDLE_VIDEOS[idlePhase];
  }, [state, idlePhase]);

  const videoSrc = getVideoSrc();
  const isIdle = state === "idle";

  // Idle sub-state timer logic
  useEffect(() => {
    if (!isIdle) {
      setIdlePhase("waving");
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];

    if (hasMessages) {
      setIdlePhase("jumping");
      let currentPhase: IdlePhase = "jumping";

      const startRotation = () => {
        const next = pickRandom(HAS_MESSAGES_PHASES, currentPhase);
        currentPhase = next;
        setIdlePhase(next);

        const scheduleNext = () => {
          const id = setTimeout(() => {
            const nextPhase = pickRandom(HAS_MESSAGES_PHASES, currentPhase);
            currentPhase = nextPhase;
            setIdlePhase(nextPhase);
            scheduleNext();
          }, randomInterval());
          timers.push(id);
        };

        scheduleNext();
      };

      const initialDelay = 20_000 + Math.random() * 15_000; // 20–35s to let user read
      const id = setTimeout(startRotation, initialDelay);
      timers.push(id);
    } else {
      setIdlePhase("waving");
      let currentPhase: IdlePhase = "waving";

      const scheduleNext = () => {
        const id = setTimeout(() => {
          const next = pickRandom(NO_MESSAGES_PHASES, currentPhase);
          currentPhase = next;
          setIdlePhase(next);
          scheduleNext();
        }, randomInterval());
        timers.push(id);
      };

      const firstDelay = 30_000 + Math.random() * 20_000;
      const id = setTimeout(() => {
        const next = pickRandom(NO_MESSAGES_PHASES, "waving");
        currentPhase = next;
        setIdlePhase(next);
        scheduleNext();
      }, firstDelay);
      timers.push(id);
    }

    return () => timers.forEach(clearTimeout);
  }, [isIdle, hasMessages, messageCount]);

  // Handle video switching — crossfade for idle, instant for active states
  useEffect(() => {
    if (videoSrc === prevSrcRef.current) return;
    prevSrcRef.current = videoSrc;

    const refs = [videoRef0, videoRef1];
    const currentVideo = refs[activeIndex].current;
    const nextVideo = refs[1 - activeIndex].current;

    if (!currentVideo || !nextVideo) return;

    if (isIdle && currentVideo.src) {
      // Crossfade: load new video on inactive element, then swap opacity
      playVideo(nextVideo, videoSrc, true);
      setActiveIndex(1 - activeIndex);
    } else {
      // Active state or first render: instant swap on current element
      playVideo(currentVideo, videoSrc, false);
    }
  }, [videoSrc, isIdle, activeIndex]);

  const videoStyle = (index: number): React.CSSProperties => ({
    opacity: index === activeIndex ? 1 : 0,
    transition: isIdle ? `opacity ${FADE_MS}ms ease-in-out` : "none",
    position: "absolute",
    inset: 0,
  });

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
          className={`relative rounded-full overflow-hidden w-[120px] h-[120px] border-[2.5px] transition-all duration-500 ${BORDER_CLASS[state]}`}
        >
          <video
            ref={videoRef0}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
            style={videoStyle(0)}
          />
          <video
            ref={videoRef1}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
            style={videoStyle(1)}
          />
        </div>
      </div>

      <p className="mt-2.5 text-base font-semibold text-foreground">Andino Support</p>
      <p className="text-sm text-muted-foreground">
        {state === "idle" ? IDLE_PHASE_SUBTITLE[idlePhase] : STATE_SUBTITLE[state]}
      </p>
    </div>
  );
}
