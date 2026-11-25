import React from "react";
import { Mic, MicOff, PhoneOff, Video, VideoOff, Radio } from "lucide-react";
import type { ZoomConnectionState } from "./ZoomSessionProvider";

interface SessionControlsProps {
  connectionState: ZoomConnectionState;
  localVideoOn: boolean;
  zoomAudioOn: boolean;
  zoomMuted: boolean;
  audioMode: string;
  onToggleVideo: () => void;
  onToggleZoomAudio: () => void;
  onDisconnectZoomAudio: () => void;
  onLeave: () => void;
}

export const SessionControls: React.FC<SessionControlsProps> = ({
  connectionState,
  localVideoOn,
  zoomAudioOn,
  zoomMuted,
  audioMode,
  onToggleVideo,
  onToggleZoomAudio,
  onDisconnectZoomAudio,
  onLeave,
}) => {
  const connected = connectionState === "connected";

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleVideo}
          disabled={!connected}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition shadow-sm ${
            localVideoOn
              ? "bg-white border border-slate-300 text-slate-800 hover:bg-slate-50"
              : "bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100"
          } disabled:opacity-40`}
        >
          {localVideoOn ? <Video className="h-3.5 w-3.5 text-blue-600" /> : <VideoOff className="h-3.5 w-3.5 text-rose-600" />}
          {localVideoOn ? "Cam On" : "Cam Off"}
        </button>

        <button
          type="button"
          onClick={onToggleZoomAudio}
          disabled={!connected || audioMode === "push_to_talk"}
          title={
            audioMode === "push_to_talk"
              ? "Zoom mic is released in Push-to-Talk mode to avoid mic contention"
              : "Toggle Zoom microphone"
          }
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition shadow-sm ${
            zoomAudioOn && !zoomMuted
              ? "bg-emerald-50 border border-emerald-300 text-emerald-800"
              : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
          } disabled:opacity-40`}
        >
          {zoomAudioOn && !zoomMuted ? (
            <Mic className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <MicOff className="h-3.5 w-3.5 text-slate-500" />
          )}
          {audioMode === "push_to_talk"
            ? "Zoom Mic Released"
            : zoomAudioOn
            ? zoomMuted
              ? "Zoom Muted"
              : "Zoom Mic Live"
            : "Enable Zoom Mic"}
        </button>

        {zoomAudioOn && (
          <button
            type="button"
            onClick={onDisconnectZoomAudio}
            className="inline-flex items-center gap-1 rounded-xl border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 shadow-sm"
          >
            <Radio className="h-3.5 w-3.5 text-amber-600" />
            Release Zoom Mic
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={onLeave}
        className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition"
      >
        <PhoneOff className="h-3.5 w-3.5" />
        End & Summarize
      </button>
    </div>
  );
};
