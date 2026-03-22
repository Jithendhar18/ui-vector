/**
 * Avatar TTS service using Web Speech API SpeechSynthesis (free)
 * Provides speaking state management and callbacks.
 */

export type AvatarState = "idle" | "listening" | "processing" | "generating" | "speaking";

interface AvatarServiceOptions {
  onStateChange: (state: AvatarState) => void;
  onWordBoundary?: (charIndex: number) => void;
  voice?: string; // preferred voice name
  rate?: number;
  pitch?: number;
}

let currentUtterance: SpeechSynthesisUtterance | null = null;
let lastSpokenText = "";

export function isTTSSupported(): boolean {
  return "speechSynthesis" in window;
}

function getPreferredVoice(preferredName?: string): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices();
  if (preferredName) {
    const match = voices.find((v) => v.name.includes(preferredName));
    if (match) return match;
  }
  // Prefer a natural-sounding English female voice
  const preferred = voices.find(
    (v) => v.lang.startsWith("en") && v.name.includes("Female")
  );
  if (preferred) return preferred;
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
    options.onStateChange("generating");

    const utterance = new SpeechSynthesisUtterance(text);
    currentUtterance = utterance;

    const voice = getPreferredVoice(options.voice);
    if (voice) utterance.voice = voice;
    utterance.rate = options.rate ?? 1.0;
    utterance.pitch = options.pitch ?? 1.0;

    utterance.onstart = () => {
      options.onStateChange("speaking");
    };

    utterance.onboundary = (event) => {
      options.onWordBoundary?.(event.charIndex);
    };

    utterance.onend = () => {
      currentUtterance = null;
      options.onStateChange("idle");
      resolve();
    };

    utterance.onerror = (event) => {
      currentUtterance = null;
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
  currentUtterance = null;
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
