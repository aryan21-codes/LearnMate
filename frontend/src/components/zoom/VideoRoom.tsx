import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
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
  const [isCollapsed, setIsCollapsed] = useState(false);

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
    <div className="flex flex-col gap-2 rounded-2xl border border-slate-800/90 bg-navy-900/70 p-2.5 sm:p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent-blue/15 text-accent-blue">
            <Video className="h-3.5 w-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-semibold text-slate-100">Study Room Camera</h2>
            <p className="text-[10px] text-slate-400">
              Zoom Video SDK • <span className="font-mono text-slate-300">{sessionTopic}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onRunAudioCompatTest}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-navy-850 px-2 py-0.5 text-[10px] font-medium text-slate-300 hover:border-accent-teal/50 hover:text-teal-300 transition"
          >
            <Wrench className="h-3 w-3" />
            <span className="hidden sm:inline">Compat Check</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCollapsed((c) => !c)}
            title={isCollapsed ? "Expand Camera Feed" : "Collapse Camera for More Whiteboard Space"}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-navy-850 px-2 py-0.5 text-[10px] font-medium text-slate-300 hover:border-slate-500 hover:text-white transition"
          >
            {isCollapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
            <span>{isCollapsed ? "Expand Cam" : "Minimize"}</span>
          </button>

          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
              connectionState === "connected"
                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                : connectionState === "connecting" || connectionState === "reconnecting"
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                : "bg-slate-800 text-slate-300 border border-slate-700"
            }`}
          >
            {connectionState === "connecting" || connectionState === "reconnecting" ? (
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
            ) : connectionState === "connected" ? (
              <CheckCircle2 className="h-2.5 w-2.5" />
            ) : (
              <AlertTriangle className="h-2.5 w-2.5 text-amber-400" />
            )}
            {connectionState === "connected"
              ? "Live"
              : connectionState === "connecting"
              ? "Joining..."
              : connectionState === "reconnecting"
              ? "Reconnecting..."
              : connectionState === "error"
              ? "Setup Needed"
              : "Idle"}
          </span>
        </div>
      </div>

      {/* Video canvas area - compact and collapsible */}
      {!isCollapsed && (
        <div className="relative min-h-[140px] max-h-[180px] rounded-xl border border-slate-800 bg-navy-950/90 p-2 flex flex-col justify-center overflow-hidden">
          <video-player-container ref={(el: HTMLElement | null) => attachContainer(el)} />

          {connectionState === "connecting" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-navy-950/80 backdrop-blur-sm">
              <Loader2 className="h-6 w-6 animate-spin text-accent-blue" />
              <p className="text-[11px] text-slate-300">
                Requesting server-side Zoom JWT & joining room...
              </p>
            </div>
          )}

          {connectionState === "error" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-navy-950/95 p-3 text-center">
              <AlertTriangle className="h-6 w-6 text-amber-400" />
              <div className="max-w-md space-y-1">
                <p className="text-xs font-semibold text-slate-100">
                  {configMissing
                    ? "Zoom Video SDK Credentials Not Configured"
                    : "Zoom Video Connection Issue"}
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">{error}</p>
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
                className="inline-flex items-center gap-1 rounded-lg bg-accent-blue px-2.5 py-1 text-[11px] font-medium text-white hover:bg-blue-500"
              >
                <RefreshCw className="h-3 w-3" />
                Retry Zoom Join
              </button>
            </div>
          )}
        </div>
      )}

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
