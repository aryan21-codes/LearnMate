import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Video,
  Wrench,
} from "lucide-react";
import { useZoomSession } from "./ZoomSessionProvider";
import { ParticipantBadgeList } from "./ParticipantVideo";
import { SessionControls } from "./SessionControls";
import type { AudioInputMode } from "../../services/AudioInputManager";

interface VideoRoomProps {
  sessionId: string;
  sessionTopic: string;
  userName: string;
  audioMode: AudioInputMode;
  onRunAudioCompatTest: () => void;
  onEndSession: () => void;
}

export const VideoRoom: React.FC<VideoRoomProps> = ({
  sessionId,
  sessionTopic,
  userName,
  audioMode,
  onRunAudioCompatTest,
  onEndSession,
}) => {
  const {
    connectionState,
    participants,
    localVideoOn,
    zoomAudioOn,
    zoomMuted,
    error,
    configMissing,
    joinSession,
    leaveSession,
    toggleVideo,
    enableZoomAudio,
    disableZoomAudio,
    toggleMuteZoomAudio,
    attachContainer,
  } = useZoomSession();

  const [joinAttempted, setJoinAttempted] = useState(false);

  useEffect(() => {
    if (!joinAttempted) {
      setJoinAttempted(true);
      void joinSession({
        sessionId,
        sessionTopic,
        userName,
        startVideo: true,
      });
    }
  }, [joinAttempted, joinSession, sessionId, sessionTopic, userName]);

  const handleLeaveAndSummarize = async () => {
    await leaveSession();
    onEndSession();
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-800/90 bg-navy-900/70 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-blue/15 text-accent-blue">
            <Video className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Virtual Study Room</h2>
            <p className="text-[11px] text-slate-400">
              Zoom Video SDK • Channel <span className="font-mono text-slate-300">{sessionTopic}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRunAudioCompatTest}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-navy-850 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:border-accent-teal/50 hover:text-teal-300 transition"
          >
            <Wrench className="h-3 w-3" />
            Audio Compat Check
          </button>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
              connectionState === "connected"
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                : connectionState === "connecting" || connectionState === "reconnecting"
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                : "bg-slate-800 text-slate-300 border border-slate-700"
            }`}
          >
            {connectionState === "connecting" || connectionState === "reconnecting" ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : connectionState === "connected" ? (
              <CheckCircle2 className="h-3 w-3" />
            ) : (
              <AlertTriangle className="h-3 w-3 text-amber-400" />
            )}
            {connectionState === "connected"
              ? "Zoom Connected"
              : connectionState === "connecting"
              ? "Connecting..."
              : connectionState === "reconnecting"
              ? "Reconnecting..."
              : connectionState === "error"
              ? "Disconnected / Setup Needed"
              : "Idle"}
          </span>
        </div>
      </div>

      {/* Video canvas area */}
      <div className="relative min-h-[240px] rounded-xl border border-slate-800 bg-navy-950/90 p-3 flex flex-col justify-center">
        <video-player-container ref={(el: HTMLElement | null) => attachContainer(el)} />

        {connectionState === "connecting" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-navy-950/80 backdrop-blur-sm">
            <Loader2 className="h-7 w-7 animate-spin text-accent-blue" />
            <p className="text-xs text-slate-300">
              Requesting server-side Zoom JWT & joining secure video room...
            </p>
          </div>
        )}

        {connectionState === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-navy-950/95 p-5 text-center">
            <AlertTriangle className="h-8 w-8 text-amber-400" />
            <div className="max-w-md space-y-1.5">
              <p className="text-sm font-semibold text-slate-100">
                {configMissing
                  ? "Zoom Video SDK Credentials Not Configured"
                  : "Zoom Video Connection Issue"}
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">{error}</p>
              {configMissing && (
                <p className="text-[11px] text-teal-300/90 bg-teal-500/10 border border-teal-500/20 rounded-lg p-2">
                  Add <code className="font-mono">ZOOM_SDK_KEY</code> and{" "}
                  <code className="font-mono">ZOOM_SDK_SECRET</code> to your root{" "}
                  <code className="font-mono">.env</code> file. Your AI Tutor & Push-to-Talk voice
                  pipeline remain active below.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() =>
                joinSession({
                  sessionId,
                  sessionTopic,
                  userName,
                  startVideo: true,
                })
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry Zoom Join
            </button>
          </div>
        )}
      </div>

      <ParticipantBadgeList participants={participants} />

      <SessionControls
        connectionState={connectionState}
        localVideoOn={localVideoOn}
        zoomAudioOn={zoomAudioOn}
        zoomMuted={zoomMuted}
        audioMode={audioMode}
        onToggleVideo={() => void toggleVideo()}
        onToggleZoomAudio={() => void toggleMuteZoomAudio()}
        onDisconnectZoomAudio={() => void disableZoomAudio()}
        onLeave={() => void handleLeaveAndSummarize()}
      />

      {error && connectionState === "connected" && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {error}
        </div>
      )}

      {/* Hidden helper if user switches to zoom_plus_speech */}
      {audioMode === "zoom_plus_speech" && connectionState === "connected" && !zoomAudioOn && (
        <div className="flex items-center justify-between rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs text-blue-200">
          <span>Simultaneous Zoom + SpeechRecognition mode selected.</span>
          <button
            type="button"
            onClick={() => void enableZoomAudio()}
            className="rounded bg-blue-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-blue-500"
          >
            Start Zoom Mic
          </button>
        </div>
      )}
    </div>
  );
};
