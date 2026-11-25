import React, { useState } from "react";
import { Mic, Volume2, X } from "lucide-react";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl text-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-display text-base font-bold text-slate-900">
              Microphone & Audio Compatibility Lab
            </h3>
            <p className="text-xs text-slate-500">
              Test Zoom Video SDK microphone ownership vs. AI speech capture.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Mode selector */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
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
                  className={`rounded-xl p-3 text-left transition ${
                    audio.mode === opt.id
                      ? "border-2 border-blue-600 bg-blue-50 text-blue-900 shadow-sm"
                      : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <div className="text-xs font-bold">{opt.title}</div>
                  <div className="mt-1 text-[10px] text-slate-500 leading-normal">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Diagnostics Actions */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void inspectMicrophones()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
              >
                <Mic className="h-3.5 w-3.5 text-blue-600" />
                Inspect Mics ({devices.length})
              </button>

              <button
                type="button"
                onClick={() => void runVoiceCaptureTest()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm"
              >
                <Volume2 className="h-3.5 w-3.5" />
                Test Voice Capture
              </button>

              {zoomConnected && (
                <button
                  type="button"
                  onClick={() => {
                    if (zoomAudioOn) {
                      void onDisableZoomAudio();
                    } else {
                      void onEnableZoomAudio();
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
                >
                  {zoomAudioOn ? "Release Zoom Audio" : "Acquire Zoom Audio"}
                </button>
              )}
            </div>

            {sampleTranscript && (
              <div className="rounded-xl border border-teal-200 bg-teal-50 p-2.5 text-xs text-teal-900 font-medium">
                Captured speech: &ldquo;{sampleTranscript}&rdquo;
              </div>
            )}

            {devices.length > 0 && (
              <div className="space-y-1 text-xs">
                <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Detected Microphones:
                </div>
                {devices.map((d, i) => (
                  <div key={d.deviceId || i} className="font-mono text-[11px] text-slate-600">
                    • {d.label || `Microphone ${i + 1}`}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Diagnostic Log Output */}
          <div className="rounded-2xl border border-slate-200 bg-slate-900 p-3 text-xs text-slate-300 font-mono max-h-36 overflow-y-auto">
            <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Live Diagnostics:</div>
            {audio.diagnosticLogs.length === 0 ? (
              <div className="text-slate-600">No events logged yet.</div>
            ) : (
              audio.diagnosticLogs.map((log: string, i: number) => (
                <div key={i} className="text-[11px] leading-relaxed">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-bold text-white shadow-sm transition"
          >
            Close Audio Lab
          </button>
        </div>
      </div>
    </div>
  );
};
