import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import ZoomVideo, { VideoQuality } from "@zoom/videosdk";
import { api } from "../../services/api";
import { audioInputManager } from "../../services/AudioInputManager";

export type ZoomConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error";

export interface ZoomParticipant {
  userId: number;
  displayName: string;
  isHost: boolean;
  isSelf: boolean;
  videoOn: boolean;
  audioOn: boolean;
  muted: boolean;
}

interface ZoomSessionContextValue {
  connectionState: ZoomConnectionState;
  participants: ZoomParticipant[];
  localVideoOn: boolean;
  zoomAudioOn: boolean;
  zoomMuted: boolean;
  error: string | null;
  configMissing: boolean;
  joinSession: (params: {
    sessionId: string;
    sessionTopic: string;
    userName: string;
    startVideo?: boolean;
  }) => Promise<void>;
  leaveSession: () => Promise<void>;
  toggleVideo: () => Promise<void>;
  enableZoomAudio: () => Promise<void>;
  disableZoomAudio: () => Promise<void>;
  toggleMuteZoomAudio: () => Promise<void>;
  attachContainer: (el: HTMLElement | null) => void;
}

const ZoomSessionContext = createContext<ZoomSessionContextValue | null>(null);

export const ZoomSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const clientRef = useRef<ReturnType<typeof ZoomVideo.createClient> | null>(null);
  const videoContainerRef = useRef<HTMLElement | null>(null);
  const attachedUsersRef = useRef<Set<number>>(new Set());
  const joinedRef = useRef(false);

  const [connectionState, setConnectionState] = useState<ZoomConnectionState>("idle");
  const [participants, setParticipants] = useState<ZoomParticipant[]>([]);
  const [localVideoOn, setLocalVideoOn] = useState(false);
  const [zoomAudioOn, setZoomAudioOn] = useState(false);
  const [zoomMuted, setZoomMuted] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configMissing, setConfigMissing] = useState(false);

  const syncParticipants = useCallback(() => {
    const client = clientRef.current;
    if (!client) return;
    try {
      const me = client.getCurrentUserInfo();
      const all = client.getAllUser();
      setParticipants(
        all.map((u) => ({
          userId: u.userId,
          displayName: u.displayName || `Participant ${u.userId}`,
          isHost: Boolean(u.isHost),
          isSelf: Boolean(me && u.userId === me.userId),
          videoOn: Boolean(u.bVideoOn),
          audioOn: Boolean(u.audio),
          muted: Boolean(u.muted),
        }))
      );
    } catch {
      // client not joined yet
    }
  }, []);

  const attachUserVideo = useCallback(async (userId: number) => {
    const client = clientRef.current;
    const container = videoContainerRef.current;
    if (!client || !container || attachedUsersRef.current.has(userId)) return;

    try {
      const mediaStream = client.getMediaStream();
      const videoEl = await mediaStream.attachVideo(userId, VideoQuality.Video_360P);
      if (videoEl && container) {
        container.appendChild(videoEl as unknown as Node);
        attachedUsersRef.current.add(userId);
      }
    } catch (err) {
      audioInputManager.logDiagnostic(`Zoom attachVideo(${userId}) failed: ${String(err)}`);
    }
  }, []);

  const detachUserVideo = useCallback(async (userId: number) => {
    const client = clientRef.current;
    if (!client || !attachedUsersRef.current.has(userId)) return;
    try {
      const mediaStream = client.getMediaStream();
      const detached = await mediaStream.detachVideo(userId);
      if (Array.isArray(detached)) {
        detached.forEach((el) => el.parentNode?.removeChild(el));
      } else if (detached && detached.parentNode) {
        detached.parentNode.removeChild(detached);
      }
    } catch {
      // ignore cleanup errors
    } finally {
      attachedUsersRef.current.delete(userId);
    }
  }, []);

  const attachContainer = useCallback(
    (el: HTMLElement | null) => {
      videoContainerRef.current = el;
      if (el && joinedRef.current && clientRef.current) {
        const all = clientRef.current.getAllUser();
        all.forEach((u) => {
          if (u.bVideoOn) {
            void attachUserVideo(u.userId);
          }
        });
      }
    },
    [attachUserVideo]
  );

  const disableZoomAudio = useCallback(async () => {
    const client = clientRef.current;
    if (!client || !joinedRef.current) {
      setZoomAudioOn(false);
      setZoomMuted(true);
      audioInputManager.setZoomAudioActive(false);
      return;
    }
    try {
      const mediaStream = client.getMediaStream();
      await mediaStream.stopAudio();
    } catch {
      // ignore if already stopped
    } finally {
      setZoomAudioOn(false);
      setZoomMuted(true);
      audioInputManager.setZoomAudioActive(false);
      syncParticipants();
    }
  }, [syncParticipants]);

  // Let AudioInputManager stop Zoom mic before acquiring push-to-talk
  useEffect(() => {
    audioInputManager.registerZoomAudioReleaser(async () => {
      if (zoomAudioOn) {
        await disableZoomAudio();
      }
    });
    return () => {
      audioInputManager.registerZoomAudioReleaser(null);
    };
  }, [zoomAudioOn, disableZoomAudio]);

  const leaveSession = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return;
    try {
      for (const uid of Array.from(attachedUsersRef.current)) {
        await detachUserVideo(uid);
      }
      if (joinedRef.current) {
        await client.leave();
      }
    } catch {
      // ignore
    } finally {
      joinedRef.current = false;
      setConnectionState("disconnected");
      setLocalVideoOn(false);
      setZoomAudioOn(false);
      setZoomMuted(true);
      setParticipants([]);
      audioInputManager.setZoomAudioActive(false);
    }
  }, [detachUserVideo]);

  const joinSession = useCallback(
    async ({
      sessionId,
      sessionTopic,
      userName,
      startVideo = true,
    }: {
      sessionId: string;
      sessionTopic: string;
      userName: string;
      startVideo?: boolean;
    }) => {
      if (joinedRef.current) return;
      setError(null);
      setConfigMissing(false);
      setConnectionState("connecting");

      try {
        const sig = await api.getZoomSignature({
          session_id: sessionId,
          session_topic: sessionTopic,
          role_type: 1,
          user_identity: userName,
        });

        const client = ZoomVideo.createClient();
        clientRef.current = client;

        await client.init("en-US", "Global", { patchJsMedia: true });

        client.on("connection-change", (payload) => {
          audioInputManager.logDiagnostic(`Zoom connection-change: ${payload.state}`);
          if (payload.state === "Connected") {
            setConnectionState("connected");
          } else if (payload.state === "Reconnecting") {
            setConnectionState("reconnecting");
          } else if (payload.state === "Closed") {
            setConnectionState("disconnected");
            joinedRef.current = false;
          } else if (payload.state === "Fail") {
            setConnectionState("error");
            setError(`Zoom connection failed (${payload.reason ?? "unknown"}).`);
          }
        });

        client.on("peer-video-state-change", (payload) => {
          if (payload.action === "Start") {
            void attachUserVideo(payload.userId);
          } else {
            void detachUserVideo(payload.userId);
          }
          syncParticipants();
        });

        client.on("user-added", () => syncParticipants());
        client.on("user-removed", (payload) => {
          payload.forEach((u) => void detachUserVideo(u.userId));
          syncParticipants();
        });

        client.on("media-sdk-change", (payload) => {
          if (payload.type === "audio" && payload.result === "fail") {
            audioInputManager.reportZoomAudioConflict("Zoom audio SDK initialization failed.");
          }
        });

        client.on("current-audio-change", (payload) => {
          audioInputManager.logDiagnostic(
            `Zoom current-audio-change: ${JSON.stringify(payload)}`
          );
          if (payload.action === "leave") {
            setZoomAudioOn(false);
            audioInputManager.setZoomAudioActive(false);
          }
        });

        await client.join(sig.session_topic, sig.signature, userName);
        joinedRef.current = true;
        setConnectionState("connected");
        audioInputManager.logDiagnostic(`Joined Zoom Video SDK session: ${sig.session_topic}`);
        syncParticipants();

        if (startVideo) {
          try {
            const mediaStream = client.getMediaStream();
            await mediaStream.startVideo();
            setLocalVideoOn(true);
            const me = client.getCurrentUserInfo();
            if (me) {
              await attachUserVideo(me.userId);
            }
            syncParticipants();
          } catch (vidErr) {
            const msg = vidErr instanceof Error ? vidErr.message : String(vidErr);
            setError(
              `Joined Zoom room, but camera failed to start (${msg}). Check browser camera permissions.`
            );
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const isMissingCreds =
          msg.toLowerCase().includes("not configured") ||
          msg.toLowerCase().includes("zoom_sdk_key");
        setConfigMissing(isMissingCreds);
        setConnectionState("error");
        setError(msg);
      }
    },
    [attachUserVideo, detachUserVideo, syncParticipants]
  );

  const toggleVideo = useCallback(async () => {
    const client = clientRef.current;
    if (!client || !joinedRef.current) return;
    const mediaStream = client.getMediaStream();
    const me = client.getCurrentUserInfo();
    try {
      if (localVideoOn) {
        await mediaStream.stopVideo();
        setLocalVideoOn(false);
        if (me) await detachUserVideo(me.userId);
      } else {
        await mediaStream.startVideo();
        setLocalVideoOn(true);
        if (me) await attachUserVideo(me.userId);
      }
      syncParticipants();
    } catch (err) {
      setError(`Camera toggle failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [attachUserVideo, detachUserVideo, localVideoOn, syncParticipants]);

  const enableZoomAudio = useCallback(async () => {
    const client = clientRef.current;
    if (!client || !joinedRef.current) return;
    try {
      const mediaStream = client.getMediaStream();
      await mediaStream.startAudio();
      setZoomAudioOn(true);
      setZoomMuted(false);
      audioInputManager.setZoomAudioActive(true);
      syncParticipants();
    } catch (err: unknown) {
      const code = (err as { errorCode?: number })?.errorCode;
      const reason = (err as { reason?: string; message?: string })?.reason ||
        (err as { message?: string })?.message ||
        String(err);
      if (code === 6011) {
        audioInputManager.reportZoomAudioConflict("Zoom error 6011 (AUDIO_CAPTURE_LOADING).");
      } else if (code === 7) {
        setError("Microphone permission prompt dismissed by user (Zoom error 7).");
      } else {
        audioInputManager.reportZoomAudioConflict(`Zoom AUDIO_CAPTURE_FAILED: ${reason}`);
      }
    }
  }, [syncParticipants]);

  const toggleMuteZoomAudio = useCallback(async () => {
    const client = clientRef.current;
    if (!client || !joinedRef.current) return;
    if (!zoomAudioOn) {
      await enableZoomAudio();
      return;
    }
    const mediaStream = client.getMediaStream();
    try {
      if (zoomMuted) {
        await mediaStream.unmuteAudio();
        setZoomMuted(false);
      } else {
        await mediaStream.muteAudio();
        setZoomMuted(true);
      }
      syncParticipants();
    } catch (err) {
      setError(`Audio mute toggle failed: ${String(err)}`);
    }
  }, [enableZoomAudio, syncParticipants, zoomAudioOn, zoomMuted]);

  useEffect(() => {
    return () => {
      void leaveSession();
    };
  }, [leaveSession]);

  return (
    <ZoomSessionContext.Provider
      value={{
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
      }}
    >
      {children}
    </ZoomSessionContext.Provider>
  );
};

export function useZoomSession() {
  const ctx = useContext(ZoomSessionContext);
  if (!ctx) throw new Error("useZoomSession must be used inside ZoomSessionProvider");
  return ctx;
}
