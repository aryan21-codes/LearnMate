import { useEffect, useState } from "react";
import { audioInputManager, type AudioManagerSnapshot } from "../services/AudioInputManager";

export function useAudioInputManager() {
  const [snapshot, setSnapshot] = useState<AudioManagerSnapshot>(() =>
    audioInputManager.getSnapshot()
  );

  useEffect(() => {
    const unsub = audioInputManager.subscribe(setSnapshot);
    return unsub;
  }, []);

  return {
    ...snapshot,
    setMode: audioInputManager.setMode.bind(audioInputManager),
    setTtsEnabled: audioInputManager.setTtsEnabled.bind(audioInputManager),
    checkPermission: audioInputManager.checkPermission.bind(audioInputManager),
    startPushToTalk: audioInputManager.startPushToTalk.bind(audioInputManager),
    stopPushToTalk: audioInputManager.stopPushToTalk.bind(audioInputManager),
    startMediaRecorderFallback:
      audioInputManager.startMediaRecorderCapture.bind(audioInputManager),
    cleanupActiveCapture: audioInputManager.cleanupActiveCapture.bind(audioInputManager),
    speakText: audioInputManager.speakText.bind(audioInputManager),
    stopSpeaking: audioInputManager.stopSpeaking.bind(audioInputManager),
    logDiagnostic: audioInputManager.logDiagnostic.bind(audioInputManager),
  };
}
