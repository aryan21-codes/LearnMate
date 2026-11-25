import React, { useEffect, useState } from "react";
import {
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
    <div className="flex flex-col gap-2.5 rounded-3xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-sm">
            <Video className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-900 tracking-tight">Study Room Camera Feed</h2>
            <p className="text-[10px] text-slate-500 font-medium">
              Zoom Video SDK • <span className="font-mono text-slate-700">{sessionTopic}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onRunAudioCompatTest}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-700 hover:bg-white hover:border-slate-300 transition shadow-sm"
          >
            <Wrench className="h-3 w-3 text-teal-600" />
            <span className="hidden sm:inline">Audio Lab</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCollapsed((c) => !c)}
            title={isCollapsed ? "Expand Camera Feed" : "Collapse Camera for More Whiteboard Space"}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-700 hover:bg-white hover:border-slate-300 transition shadow-sm"
          >
            {isCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            <span>{isCollapsed ? "Expand Cam" : "Compact Cam"}</span>
          </button>
        </div>
      </div>

      {configMissing && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 shadow-sm">
          <strong>Zoom SDK Keys Not Detected:</strong> Real-time Zoom video requires
          <code className="mx-1 rounded bg-amber-100 px-1 py-0.5 font-mono text-[11px]">ZOOM_SDK_KEY</code>
          and
          <code className="mx-1 rounded bg-amber-100 px-1 py-0.5 font-mono text-[11px]">
            ZOOM_SDK_SECRET
          </code>
          in <code className="font-mono">backend/.env</code>. The AI tutor voice & whiteboard remain fully active!
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between rounded-2xl border border-rose-300 bg-rose-50 px-3.5 py-2 text-xs text-rose-900 shadow-sm">
          <span className="truncate">{error}</span>
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
            className="inline-flex items-center gap-1 rounded-lg bg-rose-100 px-2 py-1 text-[10px] font-bold text-rose-800 hover:bg-rose-200"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        </div>
      )}

      {/* Video Viewport: Collapsible & High-contrast */}
      <div
        className={`relative overflow-hidden rounded-2xl border border-slate-800 bg-[#070b14] shadow-inner transition-all duration-300 ${
          isCollapsed ? "h-0 border-0 opacity-0 p-0 m-0 overflow-hidden" : "h-[160px] sm:h-[190px] w-full"
        }`}
      >
        <div
          ref={(node) => {
            if (node) attachContainer(node);
          }}
          className="h-full w-full"
        />

        {connectionState === "connecting" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm text-slate-300">
            <Loader2 className="mb-2 h-6 w-6 animate-spin text-blue-500" />
            <p className="text-xs font-semibold">Joining Zoom video room...</p>
          </div>
        )}

        {connectionState === "disconnected" && !configMissing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/85 p-4 text-center">
            <p className="text-xs font-semibold text-slate-300">Camera Disconnected</p>
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
              className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-500 transition"
            >
              <RefreshCw className="h-3 w-3" /> Reconnect Camera
            </button>
          </div>
        )}

        {/* Video status chip */}
        <div className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900/85 px-2 py-0.5 font-mono text-[10px] font-bold text-white shadow backdrop-blur-sm">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                connectionState === "connected"
                  ? "bg-emerald-400"
                  : connectionState === "connecting"
                  ? "bg-amber-400 animate-ping"
                  : "bg-slate-400"
              }`}
            />
            {connectionState === "connected" ? "Live Feed" : connectionState}
          </span>
        </div>
      </div>

      <ParticipantBadgeList participants={participants} />

      <SessionControls
        connectionState={connectionState}
        localVideoOn={localVideoOn}
        zoomAudioOn={zoomAudioOn}
        zoomMuted={zoomMuted}
        audioMode={audioMode}
        onToggleVideo={() => void toggleVideo()}
        onToggleZoomAudio={() => {
          if (!zoomAudioOn) {
            void enableZoomAudio();
          } else {
            void toggleMuteZoomAudio();
          }
        }}
        onDisconnectZoomAudio={() => void disableZoomAudio()}
        onLeave={() => void handleLeaveAndSummarize()}
      />
    </div>
  );
};
