/**
 * Speech-to-Text service using Web Speech API (free, Chrome built-in)
 */

type SpeechCallback = (transcript: string, isFinal: boolean) => void;
type StatusCallback = (status: "listening" | "idle" | "error") => void;

interface SpeechToTextOptions {
  onTranscript: SpeechCallback;
  onStatus: StatusCallback;
  silenceTimeout?: number; // ms before auto-send after silence
  lang?: string;
}

const SpeechRecognition =
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export function isSpeechSupported(): boolean {
  return !!SpeechRecognition;
}

export function createSpeechRecognizer(options: SpeechToTextOptions) {
  if (!SpeechRecognition) {
    throw new Error("Speech recognition not supported in this browser");
  }

  const {
    onTranscript,
    onStatus,
    silenceTimeout = 2000,
    lang = "en-US",
  } = options;

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = lang;

  let silenceTimer: ReturnType<typeof setTimeout> | null = null;
  let finalTranscript = "";
  let isRunning = false;

  function clearSilenceTimer() {
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      silenceTimer = null;
    }
  }

  recognition.onstart = () => {
    isRunning = true;
    finalTranscript = "";
    onStatus("listening");
  };

  recognition.onresult = (event: any) => {
    clearSilenceTimer();
    let interim = "";
    finalTranscript = "";

    for (let i = 0; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        finalTranscript += result[0].transcript;
      } else {
        interim += result[0].transcript;
      }
    }

    if (finalTranscript) {
      onTranscript(finalTranscript, true);
      // Start silence timer — auto-send after silence
      silenceTimer = setTimeout(() => {
        stop();
      }, silenceTimeout);
    } else if (interim) {
      onTranscript(interim, false);
    }
  };

  recognition.onerror = (event: any) => {
    if (event.error === "aborted" || event.error === "no-speech") return;
    console.error("Speech recognition error:", event.error);
    onStatus("error");
    isRunning = false;
  };

  recognition.onend = () => {
    clearSilenceTimer();
    isRunning = false;
    onStatus("idle");
  };

  function start() {
    if (isRunning) return;
    try {
      recognition.start();
    } catch {
      // already started
    }
  }

  function stop() {
    clearSilenceTimer();
    if (isRunning) {
      try {
        recognition.stop();
      } catch {
        // already stopped
      }
    }
  }

  function abort() {
    clearSilenceTimer();
    try {
      recognition.abort();
    } catch {
      // ignore
    }
    isRunning = false;
  }

  return { start, stop, abort, isRunning: () => isRunning };
}
