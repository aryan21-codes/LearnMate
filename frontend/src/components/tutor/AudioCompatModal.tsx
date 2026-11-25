import React, { useState } from "react";
import { CheckCircle2, Mic, ShieldAlert, Volume2, X } from "lucide-react";
import { useAudioInputManager } from "../../hooks/useAudioInputManager";
import type { AudioInputMode } from "../../services/AudioInputManager";

interface AudioCompatModalProps {
  open: boolean;
  onClose: () => void;
  zoomConnected: boolean;
  zoomAudioOn: boolean;
  onEnableZoomAudio: () => Promise<void>;
  onDisableZoomAudio: () => Promise<void>;
}

export const AudioCompatModal: React.FC<AudioCompatModalProps> = ({
  open,
  onClose,
  zoomConnected,
  zoomAudioOn,
  onEnableZoomAudio,
  onDisableZoomAudio,
}) => {
  const audio = useAudioInputManager();
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [sampleTranscript, setSampleTranscript] = useState("");

  if (!open) return null;

  const inspectMicrophones = async () => {
    audio.logDiagnostic("Checking microphone permission and available audio input devices...");
    await audio.checkPermission();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      const all = await navigator.mediaDevices.enumerateDevices();
      const mics = all.filter((d) => d.kind === "audioinput");
      setDevices(mics);
      audio.logDiagnostic(`Detected ${mics.length} audio input device(s).`);
    } catch (err) {
      audio.logDiagnostic(`Mic inspection error: ${String(err)}`);
    }
  };

  const runVoiceCaptureTest = async () => {
    setSampleTranscript("");
    await audio.startPushToTalk((text) => {
      setSampleTranscript(text);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-slate-700/80 bg-navy-900 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              Microphone & Audio Compatibility Lab
            </h3>
            <p className="text-xs text-slate-400">
              Test Zoom Video SDK microphone ownership vs. AI speech capture.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Mode selector */}
          <div className="rounded-xl border border-slate-800 bg-navy-950/80 p-3">
            <label className="mb-2 block text-xs font-medium text-slate-300">
              Active Audio Input Architecture
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(
                [
                  {
                    id: "push_to_talk",
                    title: "Push-to-Talk (Safe)",
                    desc: "Releases Zoom mic during AI voice capture",
                  },
                  {
                    id: "zoom_plus_speech",
                    title: "Simultaneous Test",
                    desc: "Zoom mic + SpeechRecognition together",
                  },
                  {
                    id: "text_only",
                    title: "Text Only",
                    desc: "Disable microphone capture completely",
                  },
                ] as Array<{ id: AudioInputMode; title: string; desc: string }>
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => audio.setMode(opt.id)}
                  className={`rounded-xl border p-2.5 text-left transition ${
                    audio.mode === opt.id
                      ? "border-accent-teal bg-accent-teal/10 text-teal-200"
                      : "border-slate-800 bg-navy-900 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  <div className="text-xs font-semibold">{opt.title}</div>
                  <div className="mt-0.5 text-[11px] text-slate-400">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Hardware & Zoom status */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-slate-800 bg-navy-950/70 p-3 space-y-1">
              <div className="text-slate-400">Browser Support</div>
              <div className="flex items-center gap-1.5 text-slate-200">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                SpeechRecognition:{" "}
                {audio.speechRecognitionSupported ? "Supported" : "Unavailable (MediaRecorder used)"}
              </div>
              <div className="text-slate-300">Permission: {audio.permissionState}</div>
              <div className="text-slate-300">Current Owner: {audio.activeOwner}</div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-navy-950/70 p-3 space-y-1">
              <div className="text-slate-400">Zoom Audio State</div>
              <div className="text-slate-200">
                Session: {zoomConnected ? "Connected" : "Not Connected"}
              </div>
              <div className="text-slate-300">
                Zoom Mic: {zoomAudioOn ? "Active" : "Released / Off"}
              </div>
              {audio.conflictDetected && (
                <div className="flex items-center gap-1 text-amber-300">
                  <ShieldAlert className="h-3.5 w-3.5" /> Conflict detected earlier
                </div>
              )}
            </div>
          </div>

          {/* Interactive test actions */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void inspectMicrophones()}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
            >
              1. Inspect Mics
            </button>
            {zoomConnected && !zoomAudioOn && (
              <button
                type="button"
                onClick={() => void onEnableZoomAudio()}
                className="rounded-lg border border-blue-500/40 bg-blue-500/15 px-3 py-1.5 text-xs font-medium text-blue-200 hover:bg-blue-500/25"
              >
                2. Start Zoom Audio
              </button>
            )}
            {zoomConnected && zoomAudioOn && (
              <button
                type="button"
                onClick={() => void onDisableZoomAudio()}
                className="rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-200 hover:bg-amber-500/25"
              >
                Release Zoom Audio
              </button>
            )}
            {audio.recordingState === "idle" ? (
              <button
                type="button"
                onClick={() => void runVoiceCaptureTest()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent-teal px-3 py-1.5 text-xs font-semibold text-navy-950 hover:bg-teal-400"
              >
                <Mic className="h-3.5 w-3.5" />
                3. Test Speech Capture
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void audio.stopPushToTalk((t) => setSampleTranscript(t))}
                className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500"
              >
                Stop & Transcribe
              </button>
            )}
            <button
              type="button"
              onClick={() => audio.speakText("LearnMate audio playback check is working.")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-navy-850 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
            >
              <Volume2 className="h-3.5 w-3.5" />
              Test TTS
            </button>
          </div>

          {devices.length > 0 && (
            <div className="text-[11px] text-slate-400">
              Devices:{" "}
              {devices.map((d, i) => d.label || `Microphone ${i + 1}`).join(" • ")}
            </div>
          )}

          {(audio.interimTranscript || sampleTranscript) && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-200">
              Captured transcript:{" "}
              <span className="font-medium">{sampleTranscript || audio.interimTranscript}</span>
            </div>
          )}

          {audio.error && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-200">
              {audio.error}
            </div>
          )}

          {/* Diagnostic log */}
          <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-800 bg-navy-950 p-2.5 font-mono text-[11px] text-slate-400">
            {audio.diagnosticLogs.length === 0 ? (
              <span>Diagnostic log is empty. Run steps 1–3 above to verify hardware behavior.</span>
            ) : (
              audio.diagnosticLogs.map((line, idx) => <div key={idx}>{line}</div>)
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
