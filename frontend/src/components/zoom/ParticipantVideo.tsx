import React from "react";
import { Mic, MicOff, Video, VideoOff, Shield } from "lucide-react";
import type { ZoomParticipant } from "./ZoomSessionProvider";

export const ParticipantBadgeList: React.FC<{ participants: ZoomParticipant[] }> = ({
  participants,
}) => {
  if (participants.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {participants.map((p) => (
        <div
          key={p.userId}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700/60 bg-navy-900/90 px-2.5 py-1 text-xs text-slate-200"
        >
          <span className="font-medium">
            {p.displayName} {p.isSelf ? "(You)" : ""}
          </span>
          {p.isHost && <Shield className="h-3 w-3 text-accent-teal" />}
          {p.videoOn ? (
            <Video className="h-3 w-3 text-accent-blue" />
          ) : (
            <VideoOff className="h-3 w-3 text-slate-500" />
          )}
          {p.audioOn && !p.muted ? (
            <Mic className="h-3 w-3 text-emerald-400" />
          ) : (
            <MicOff className="h-3 w-3 text-slate-500" />
          )}
        </div>
      ))}
    </div>
  );
};
