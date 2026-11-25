import { api } from "./api";

export type AudioInputMode = "push_to_talk" | "zoom_plus_speech" | "text_only";
export type MicPermissionState = "unknown" | "prompt" | "granted" | "denied" | "unsupported";
export type CaptureOwner = "none" | "zoom" | "ai_speech_recognition" | "ai_media_recorder";
export type RecordingState = "idle" | "listening" | "recording" | "transcribing";

export interface AudioManagerSnapshot {
  mode: AudioInputMode;
  permissionState: MicPermissionState;
  activeOwner: CaptureOwner;
  recordingState: RecordingState;
  interimTranscript: string;
  error: string | null;
  conflictDetected: boolean;
  isSpeakingTTS: boolean;
  ttsEnabled: boolean;
  speechRecognitionSupported: boolean;
  mediaRecorderSupported: boolean;
  diagnosticLogs: string[];
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [altIndex: number]: { transcript: string };
    };
  };
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: { error: string; message?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type Listener = (snapshot: AudioManagerSnapshot) => void;

class AudioInputManager {
  private listeners = new Set<Listener>();
  private recognition: SpeechRecognitionLike | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private activeStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private releaseZoomAudioHook: (() => Promise<void>) | null = null;
  private finalTranscriptBuffer = "";

  private state: AudioManagerSnapshot = {
    mode: "push_to_talk",
    permissionState: "unknown",
    activeOwner: "none",
    recordingState: "idle",
    interimTranscript: "",
    error: null,
    conflictDetected: false,
    isSpeakingTTS: false,
    ttsEnabled: true,
    speechRecognitionSupported:
      typeof window !== "undefined" &&
      Boolean(
        (window as unknown as Record<string, unknown>).SpeechRecognition ||
          (window as unknown as Record<string, unknown>).webkitSpeechRecognition
      ),
    mediaRecorderSupported:
      typeof window !== "undefined" &&
      typeof navigator !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia) &&
      typeof window.MediaRecorder !== "undefined",
    diagnosticLogs: [],
  };

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot(): AudioManagerSnapshot {
    return { ...this.state, diagnosticLogs: [...this.state.diagnosticLogs] };
  }

  private emit(patch: Partial<AudioManagerSnapshot>) {
    this.state = { ...this.state, ...patch };
    const snap = this.getSnapshot();
    this.listeners.forEach((l) => l(snap));
  }

  logDiagnostic(message: string) {
    const ts = new Date().toLocaleTimeString();
    const next = [...this.state.diagnosticLogs.slice(-24), `[${ts}] ${message}`];
    this.emit({ diagnosticLogs: next });
  }

  registerZoomAudioReleaser(hook: (() => Promise<void>) | null) {
    this.releaseZoomAudioHook = hook;
  }

  setZoomAudioActive(active: boolean) {
    if (active) {
      this.emit({ activeOwner: "zoom" });
      this.logDiagnostic("Zoom Video SDK acquired microphone stream.");
    } else if (this.state.activeOwner === "zoom") {
      this.emit({ activeOwner: "none" });
      this.logDiagnostic("Zoom Video SDK released microphone stream.");
    }
  }

  reportZoomAudioConflict(reason: string) {
    this.logDiagnostic(`Zoom audio conflict detected: ${reason}`);
    this.emit({
      conflictDetected: true,
      mode: "push_to_talk",
      error: `${reason} Switched automatically to safe Push-to-Talk fallback mode.`,
    });
  }

  setMode(mode: AudioInputMode) {
    if (mode === this.state.mode) return;
    this.cleanupActiveCapture();
    this.logDiagnostic(`Audio input mode changed to: ${mode}`);
    this.emit({ mode, error: null });
  }

  setTtsEnabled(enabled: boolean) {
    if (!enabled) this.stopSpeaking();
    this.emit({ ttsEnabled: enabled });
  }

  async checkPermission(): Promise<MicPermissionState> {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.emit({
        permissionState: "unsupported",
        mode: "text_only",
        error: "Microphone API unavailable (requires HTTPS or localhost).",
      });
      return "unsupported";
    }
    try {
      if (navigator.permissions?.query) {
        const status = await navigator.permissions.query({
          name: "microphone" as PermissionName,
        });
        const mapped: MicPermissionState =
          status.state === "granted"
            ? "granted"
            : status.state === "denied"
            ? "denied"
            : "prompt";
        this.emit({ permissionState: mapped });
        return mapped;
      }
    } catch {
      // permissions.query may not support microphone in all browsers
    }
    return this.state.permissionState;
  }

  async startPushToTalk(onFinalTranscript: (text: string) => void): Promise<void> {
    if (this.state.recordingState !== "idle") {
      return;
    }
    this.stopSpeaking();
    this.emit({ error: null, interimTranscript: "" });

    // Ensure Zoom releases the hardware microphone track before AI capture starts
    if (this.state.mode === "push_to_talk" && this.releaseZoomAudioHook) {
      try {
        await this.releaseZoomAudioHook();
      } catch (err) {
        this.logDiagnostic(`Zoom release warning: ${String(err)}`);
      }
    }

    if (this.state.mode === "text_only") {
      this.emit({ error: "Text-only mode is active. Switch to Push-to-Talk to speak." });
      return;
    }

    // Prefer browser SpeechRecognition when supported, unless user prefers MediaRecorder or SR fails
    if (this.state.speechRecognitionSupported) {
      this.startSpeechRecognitionCapture(onFinalTranscript);
    } else if (this.state.mediaRecorderSupported) {
      await this.startMediaRecorderCapture();
    } else {
      this.emit({
        mode: "text_only",
        error: "Neither Web Speech API nor MediaRecorder is supported in this browser. Use text input.",
      });
    }
  }

  private startSpeechRecognitionCapture(onFinalTranscript: (text: string) => void) {
    const win = window as unknown as Record<string, new () => SpeechRecognitionLike>;
    const SR = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SR) return;

    this.finalTranscriptBuffer = "";
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onstart = () => {
      this.logDiagnostic("SpeechRecognition started.");
      this.emit({
        permissionState: "granted",
        activeOwner: "ai_speech_recognition",
        recordingState: "listening",
      });
    };

    rec.onresult = (ev) => {
      let interim = "";
      let finalChunk = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i];
        const txt = res[0]?.transcript || "";
        if (res.isFinal) {
          finalChunk += txt + " ";
        } else {
          interim += txt;
        }
      }
      if (finalChunk) {
        this.finalTranscriptBuffer = `${this.finalTranscriptBuffer} ${finalChunk}`.trim();
      }
      this.emit({
        interimTranscript: `${this.finalTranscriptBuffer} ${interim}`.trim(),
      });
    };

    rec.onerror = (ev) => {
      this.logDiagnostic(`SpeechRecognition error: ${ev.error}`);
      if (ev.error === "not-allowed" || ev.error === "service-not-allowed") {
        this.emit({
          permissionState: "denied",
          recordingState: "idle",
          activeOwner: "none",
          error:
            "Microphone permission denied. Allow microphone access in your browser site settings and retry.",
        });
        return;
      }
      if (ev.error === "audio-capture" || ev.error === "aborted") {
        const wasZoomMode = this.state.mode === "zoom_plus_speech";
        this.emit({
          conflictDetected: wasZoomMode || this.state.conflictDetected,
          mode: "push_to_talk",
          recordingState: "idle",
          activeOwner: "none",
          error: wasZoomMode
            ? "Microphone contention detected between Zoom and SpeechRecognition. Switched to Push-to-Talk fallback."
            : "Audio capture interrupted. Try holding Push-to-Talk again or use MediaRecorder fallback.",
        });
        return;
      }
      if (ev.error !== "no-speech") {
        this.emit({ error: `Speech recognition error: ${ev.error}` });
      }
    };

    rec.onend = () => {
      const captured = (this.finalTranscriptBuffer || this.state.interimTranscript).trim();
      this.recognition = null;
      this.emit({
        recordingState: "idle",
        activeOwner: "none",
      });
      this.logDiagnostic(`SpeechRecognition ended. Captured length: ${captured.length} chars.`);
      if (captured) {
        onFinalTranscript(captured);
      }
    };

    this.recognition = rec;
    try {
      rec.start();
    } catch (err) {
      this.recognition = null;
      this.emit({
        recordingState: "idle",
        activeOwner: "none",
        error: `Could not start voice capture: ${String(err)}`,
      });
    }
  }

  async startMediaRecorderCapture(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.emit({
        permissionState: "unsupported",
        error: "Browser mediaDevices.getUserMedia unavailable.",
      });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.activeStream = stream;
      this.audioChunks = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.audioChunks.push(e.data);
      };
      this.mediaRecorder = recorder;
      recorder.start();
      this.logDiagnostic("MediaRecorder fallback capture started.");
      this.emit({
        permissionState: "granted",
        activeOwner: "ai_media_recorder",
        recordingState: "recording",
        error: null,
      });
    } catch (err) {
      this.releaseStreamTracks();
      const msg = err instanceof Error ? err.message : String(err);
      this.emit({
        permissionState: msg.toLowerCase().includes("denied") ? "denied" : "prompt",
        recordingState: "idle",
        activeOwner: "none",
        error: `Microphone access failed: ${msg}`,
      });
    }
  }

  async stopPushToTalk(onFinalTranscript?: (text: string) => void): Promise<void> {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        this.cleanupActiveCapture();
      }
      return;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      const recorder = this.mediaRecorder;
      this.emit({ recordingState: "transcribing" });
      await new Promise<void>((resolve) => {
        recorder.onstop = async () => {
          const blob = new Blob(this.audioChunks, { type: "audio/webm" });
          this.releaseStreamTracks();
          this.mediaRecorder = null;
          this.audioChunks = [];
          try {
            const res = await api.transcribeAudio(blob);
            if (res.transcript && onFinalTranscript) {
              onFinalTranscript(res.transcript);
            }
          } catch (err) {
            this.emit({
              error: err instanceof Error ? err.message : "Backend transcription failed.",
            });
          } finally {
            this.emit({ recordingState: "idle", activeOwner: "none" });
            resolve();
          }
        };
        recorder.stop();
      });
    }
  }

  private releaseStreamTracks() {
    if (this.activeStream) {
      this.activeStream.getTracks().forEach((t) => t.stop());
      this.activeStream = null;
      this.logDiagnostic("Released MediaStream microphone tracks.");
    }
  }

  cleanupActiveCapture() {
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // ignore
      }
      this.recognition = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try {
        this.mediaRecorder.stop();
      } catch {
        // ignore
      }
    }
    this.mediaRecorder = null;
    this.releaseStreamTracks();
    if (this.state.activeOwner !== "zoom") {
      this.emit({ activeOwner: "none", recordingState: "idle" });
    } else {
      this.emit({ recordingState: "idle" });
    }
  }

  speakText(text: string) {
    if (!this.state.ttsEnabled || typeof window === "undefined" || !window.speechSynthesis) {
      return;
    }
    const clean = text.trim();
    if (!clean) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.02;
    utterance.pitch = 1.0;
    utterance.onstart = () => this.emit({ isSpeakingTTS: true });
    utterance.onend = () => this.emit({ isSpeakingTTS: false });
    utterance.onerror = () => this.emit({ isSpeakingTTS: false });
    window.speechSynthesis.speak(utterance);
  }

  stopSpeaking() {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this.emit({ isSpeakingTTS: false });
  }
}

export const audioInputManager = new AudioInputManager();
