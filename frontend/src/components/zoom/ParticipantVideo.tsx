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
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm"
        >
          <span>
            {p.displayName} {p.isSelf ? "(You)" : ""}
          </span>
          {p.isHost && <Shield className="h-3 w-3 text-teal-600" />}
          {p.videoOn ? (
            <Video className="h-3 w-3 text-blue-600" />
          ) : (
            <VideoOff className="h-3 w-3 text-slate-400" />
          )}
          {p.audioOn && !p.muted ? (
            <Mic className="h-3 w-3 text-emerald-600" />
          ) : (
            <MicOff className="h-3 w-3 text-slate-400" />
          )}
        </div>
      ))}
    </div>
  );
};
