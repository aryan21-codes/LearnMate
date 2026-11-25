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
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-navy-900/90 px-3 py-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleVideo}
          disabled={!connected}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            localVideoOn
              ? "bg-slate-800 text-slate-100 hover:bg-slate-700"
              : "bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25"
          } disabled:opacity-40`}
        >
          {localVideoOn ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5" />}
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
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            zoomAudioOn && !zoomMuted
              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
              : "bg-slate-800 text-slate-300 hover:bg-slate-700"
          } disabled:opacity-40`}
        >
          {zoomAudioOn && !zoomMuted ? (
            <Mic className="h-3.5 w-3.5" />
          ) : (
            <MicOff className="h-3.5 w-3.5" />
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
            className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-300 hover:bg-amber-500/20"
          >
            <Radio className="h-3.5 w-3.5" />
            Release Zoom Mic
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={onLeave}
        className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-500 transition"
      >
        <PhoneOff className="h-3.5 w-3.5" />
        End & Summarize
      </button>
    </div>
  );
};
