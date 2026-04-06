/**
 * Avatar TTS service using Web Speech API SpeechSynthesis (free)
 * Provides speaking state management and callbacks.
 */

export type AvatarState = "idle" | "listening" | "processing" | "generating" | "speaking" | "error";

interface AvatarServiceOptions {
  onStateChange: (state: AvatarState) => void;
  onWordBoundary?: (charIndex: number) => void;
  voice?: string; // preferred voice name
  rate?: number;
  pitch?: number;
}

let lastSpokenText = "";

export function isTTSSupported(): boolean {
  return "speechSynthesis" in window;
}

// Priority list of natural-sounding English voices
const PREFERRED_VOICE_NAMES = [
  "Google UK English Female",
  "Google US English",
  "Microsoft Zira",
  "Samantha",
  "Karen",
  "Moira",
  "Tessa",
];

function getPreferredVoice(preferredName?: string): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices();
  if (preferredName) {
    const match = voices.find((v) => v.name.includes(preferredName));
    if (match) return match;
  }
  // Try each preferred voice in priority order
  for (const name of PREFERRED_VOICE_NAMES) {
    const match = voices.find((v) => v.name.includes(name) && v.lang.startsWith("en"));
    if (match) return match;
  }
  // Fallback to first English voice
  return voices.find((v) => v.lang.startsWith("en")) ?? voices[0] ?? null;
}

export function speak(
  text: string,
  options: AvatarServiceOptions
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!isTTSSupported()) {
      reject(new Error("TTS not supported"));
      return;
    }

    // Cancel any ongoing speech
    stopSpeaking();

    lastSpokenText = text;
    options.onStateChange("speaking");

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = getPreferredVoice(options.voice);
    if (voice) utterance.voice = voice;
    utterance.rate = options.rate ?? 0.95;
    utterance.pitch = options.pitch ?? 1.05;

    utterance.onstart = () => {
      options.onStateChange("speaking");
    };

    utterance.onboundary = (event) => {
      options.onWordBoundary?.(event.charIndex);
    };

    utterance.onend = () => {
      options.onStateChange("idle");
      resolve();
    };

    utterance.onerror = (event) => {
      if (event.error === "canceled" || event.error === "interrupted") {
        options.onStateChange("idle");
        resolve();
      } else {
        options.onStateChange("idle");
        reject(new Error(event.error));
      }
    };

    // Small delay to allow voices to load
    setTimeout(() => {
      speechSynthesis.speak(utterance);
    }, 50);
  });
}

export function stopSpeaking() {
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
  }
}

export function isSpeaking(): boolean {
  return speechSynthesis.speaking;
}

export function getLastSpokenText(): string {
  return lastSpokenText;
}

export function replayLastResponse(options: AvatarServiceOptions): Promise<void> {
  if (!lastSpokenText) return Promise.resolve();
  return speak(lastSpokenText, options);
}
