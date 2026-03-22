import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  isSpeechSupported,
  createSpeechRecognizer,
} from "@/services/speechToText";

interface VoiceInputProps {
  onTranscriptReady: (text: string) => void;
  onListeningChange?: (listening: boolean) => void;
  disabled?: boolean;
}

export default function VoiceInput({
  onTranscriptReady,
  onListeningChange,
  disabled,
}: VoiceInputProps) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState(false);
  const recognizerRef = useRef<ReturnType<typeof createSpeechRecognizer> | null>(null);
  const finalRef = useRef("");

  const supported = isSpeechSupported();

  const stopListening = useCallback(() => {
    recognizerRef.current?.stop();
    setListening(false);
    onListeningChange?.(false);
  }, [onListeningChange]);

  const startListening = useCallback(() => {
    if (!supported) return;
    setError(false);
    setInterim("");
    finalRef.current = "";

    const recognizer = createSpeechRecognizer({
      onTranscript: (text, isFinal) => {
        if (isFinal) {
          finalRef.current = text;
          setInterim("");
        } else {
          setInterim(text);
        }
      },
      onStatus: (status) => {
        if (status === "idle") {
          setListening(false);
          onListeningChange?.(false);
          // Auto-send the final transcript
          if (finalRef.current.trim()) {
            onTranscriptReady(finalRef.current.trim());
            finalRef.current = "";
          }
        } else if (status === "error") {
          setError(true);
          setListening(false);
          onListeningChange?.(false);
        }
      },
      silenceTimeout: 2000,
    });

    recognizerRef.current = recognizer;
    recognizer.start();
    setListening(true);
    onListeningChange?.(true);
  }, [supported, onTranscriptReady, onListeningChange]);

  const toggle = useCallback(() => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  }, [listening, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognizerRef.current?.abort();
    };
  }, []);

  if (!supported) return null;

  return (
    <div className="flex items-center gap-2">
      {/* Live transcription indicator */}
      {listening && interim && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-card border border-border rounded-xl px-3 py-2 text-xs text-muted-foreground max-w-[80%] truncate shadow-md animate-fade-in">
          <span className="inline-block h-2 w-2 rounded-full bg-destructive animate-pulse mr-2" />
          {interim}
        </div>
      )}

      <Button
        type="button"
        variant={listening ? "destructive" : "outline"}
        size="icon"
        onClick={toggle}
        disabled={disabled}
        className={`h-8 w-8 rounded-full shrink-0 transition-all duration-200 active:scale-95 ${
          listening ? "ring-2 ring-destructive/30 animate-pulse" : ""
        } ${error ? "ring-2 ring-destructive" : ""}`}
        aria-label={listening ? "Stop listening" : "Start voice input"}
      >
        {listening ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
