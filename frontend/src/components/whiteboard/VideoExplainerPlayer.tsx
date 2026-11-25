import React, { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Film,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { VideoScene, VideoWalkthroughResponse } from "../../types";
import { MermaidDiagram } from "./MermaidDiagram";

interface VideoExplainerPlayerProps {
  walkthrough: VideoWalkthroughResponse;
  onClose?: () => void;
}

export const VideoExplainerPlayer: React.FC<VideoExplainerPlayerProps> = ({
  walkthrough,
  onClose,
}) => {
  const [currentSceneIdx, setCurrentSceneIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sceneProgress, setSceneProgress] = useState(0);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const progressTimerRef = useRef<number | null>(null);

  const scenes = walkthrough.scenes || [];
  const currentScene: VideoScene | undefined = scenes[currentSceneIdx];

  // Stop speech when component unmounts - ONLY if this player was actively narrating
  useEffect(() => {
    return () => {
      if (utteranceRef.current && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        utteranceRef.current = null;
      }
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, []);

  // Play narration for the active scene
  const playSceneNarration = (sceneIdx: number) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);

    const targetScene = scenes[sceneIdx];
    if (!targetScene) return;

    setSceneProgress(0);
    const durationEstimateMs = (targetScene.duration_seconds || 10) * 1000;
    const intervalMs = 100;
    let elapsed = 0;

    progressTimerRef.current = window.setInterval(() => {
      elapsed += intervalMs;
      setSceneProgress(Math.min((elapsed / durationEstimateMs) * 100, 100));
    }, intervalMs);

    if (isMuted) {
      // Simulate advance after duration
      setTimeout(() => {
        if (sceneIdx < scenes.length - 1) {
          setCurrentSceneIdx(sceneIdx + 1);
        } else {
          setIsPlaying(false);
        }
      }, durationEstimateMs);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(targetScene.narration);
    utterance.rate = playbackRate;
    utterance.pitch = 1.0;

    // Pick natural voice if available
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(
      (v) =>
        (v.name.includes("Natural") ||
          v.name.includes("Google") ||
          v.name.includes("Microsoft") ||
          v.lang.startsWith("en")) &&
        v.localService
    );
    if (naturalVoice) utterance.voice = naturalVoice;

    utterance.onend = () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      setSceneProgress(100);
      if (sceneIdx < scenes.length - 1) {
        // Auto-advance to next scene after brief pause
        setTimeout(() => {
          setCurrentSceneIdx(sceneIdx + 1);
        }, 800);
      } else {
        setIsPlaying(false);
      }
    };

    utterance.onerror = () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      setIsPlaying(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Trigger speech on scene change when isPlaying is true
  useEffect(() => {
    if (isPlaying) {
      playSceneNarration(currentSceneIdx);
    } else {
      if (utteranceRef.current && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        utteranceRef.current = null;
      }
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    }
  }, [currentSceneIdx, isPlaying, playbackRate, isMuted]);

  const handleTogglePlay = () => {
    if (isPlaying) {
      if (utteranceRef.current && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        utteranceRef.current = null;
      }
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
    }
  };

  const handleNextScene = () => {
    if (currentSceneIdx < scenes.length - 1) {
      setCurrentSceneIdx((idx) => idx + 1);
    }
  };

  const handlePrevScene = () => {
    if (currentSceneIdx > 0) {
      setCurrentSceneIdx((idx) => idx - 1);
    }
  };

  const handleReplay = () => {
    setCurrentSceneIdx(0);
    setIsPlaying(true);
  };

  const handleDownloadTranscript = () => {
    const text = `# ${walkthrough.title}\nTopic: ${walkthrough.topic}\n\n${walkthrough.summary}\n\n` +
      scenes
        .map(
          (s) =>
            `## Scene ${s.scene_number}: ${s.title}\nNarration: ${s.narration}\nKey Points:\n` +
            s.key_points.map((p) => `- ${p}`).join("\n") +
            (s.diagram_mermaid ? `\n\n\`\`\`mermaid\n${s.diagram_mermaid}\n\`\`\`\n` : "\n")
        )
        .join("\n---\n\n");

    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${walkthrough.title.replace(/\s+/g, "_")}_Storyscript.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!currentScene) {
    return <div className="p-4 text-center text-xs text-slate-400">No scenes generated.</div>;
  }

  return (
    <div
      className={`flex flex-col rounded-2xl border border-indigo-500/40 bg-navy-950/95 shadow-2xl transition-all ${
        isFullscreen ? "fixed inset-3 z-50 overflow-y-auto p-6 bg-navy-950/98" : "p-4"
      }`}
    >
      {/* Video Player Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Film className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <span>{walkthrough.title}</span>
              <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-medium text-indigo-300">
                AI Video Explainer
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">{walkthrough.summary}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleDownloadTranscript}
            title="Download Video Storyboard Script"
            className="inline-flex items-center gap-1 rounded-md border border-slate-700/80 px-2 py-1 text-[11px] text-slate-400 hover:text-slate-200"
          >
            <Download className="h-3 w-3" />
            <span className="hidden sm:inline">Export Script</span>
          </button>
          <button
            type="button"
            onClick={() => setIsFullscreen((f) => !f)}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Video"}
            className="rounded-md border border-slate-700/80 p-1 text-slate-400 hover:text-slate-200"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-700/80 px-2 py-1 text-[11px] text-slate-400 hover:text-rose-300"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Visual Canvas Stage */}
      <div className="my-3 rounded-xl border border-slate-800/90 bg-navy-900/50 p-4">
        {/* Scene Info Banner */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-300 border border-indigo-500/30">
              SCENE {currentSceneIdx + 1} OF {scenes.length}
            </span>
            <span className="text-xs font-semibold text-slate-200">{currentScene.title}</span>
          </div>
          {currentScene.visual_focus && (
            <span className="text-[11px] text-indigo-300/90 font-medium">
              🎯 Focus: {currentScene.visual_focus}
            </span>
          )}
        </div>

        {/* Dynamic Scene Whiteboard Illustration */}
        <div className="min-h-[260px]">
          {currentScene.diagram_mermaid ? (
            <MermaidDiagram
              key={`video_scene_diagram_${currentSceneIdx}`}
              definition={currentScene.diagram_mermaid}
              title={currentScene.title}
              fallbackText={currentScene.narration}
              compact
            />
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-navy-950/70 p-6 text-center">
              <Sparkles className="mb-2 h-6 w-6 text-indigo-400 animate-pulse" />
              <p className="text-xs font-medium text-slate-200">{currentScene.title}</p>
              <p className="mt-1 text-[11px] text-slate-400">{currentScene.narration}</p>
            </div>
          )}
        </div>

        {/* Key Takeaways */}
        {currentScene.key_points?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-slate-800/60">
            {currentScene.key_points.map((pt, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-md bg-navy-950/90 border border-slate-800 px-2 py-1 text-[11px] text-slate-300"
              >
                <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                <span>{pt}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Subtitles / AI Voiceover Caption Box */}
      <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/30 px-4 py-2.5 mb-3 flex items-start gap-2.5">
        <Volume2 className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5 animate-pulse" />
        <div className="flex-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block mb-0.5">
            AI Voiceover Narration
          </span>
          <p className="text-xs leading-relaxed text-slate-100 font-medium">
            "{currentScene.narration}"
          </p>
        </div>
      </div>

      {/* Timeline Scrub Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-mono">
          <span>Scene {currentSceneIdx + 1}: {currentScene.title}</span>
          <span>~{walkthrough.total_duration_seconds}s total</span>
        </div>
        {/* Multi-scene step track */}
        <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
          {scenes.map((_, idx) => (
            <div
              key={idx}
              onClick={() => setCurrentSceneIdx(idx)}
              className={`cursor-pointer rounded-full transition-all relative overflow-hidden ${
                idx < currentSceneIdx
                  ? "bg-indigo-500"
                  : idx === currentSceneIdx
                  ? "bg-slate-700"
                  : "bg-slate-800"
              }`}
            >
              {idx === currentSceneIdx && (
                <div
                  style={{ width: `${sceneProgress}%` }}
                  className="absolute inset-y-0 left-0 bg-indigo-400 transition-all duration-100"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Player Transport Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrevScene}
            disabled={currentSceneIdx === 0}
            title="Previous Scene"
            className="rounded-lg border border-slate-800 bg-navy-900/80 p-1.5 text-slate-300 hover:text-white disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={handleTogglePlay}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition shadow-lg ${
              isPlaying
                ? "bg-amber-500 text-slate-950 hover:bg-amber-400"
                : "bg-indigo-500 text-white hover:bg-indigo-400"
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="h-3.5 w-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Play Video</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleNextScene}
            disabled={currentSceneIdx === scenes.length - 1}
            title="Next Scene"
            className="rounded-lg border border-slate-800 bg-navy-900/80 p-1.5 text-slate-300 hover:text-white disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={handleReplay}
            title="Restart from Scene 1"
            className="rounded-lg border border-slate-800 bg-navy-900/80 p-1.5 text-slate-400 hover:text-slate-200"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Audio Mute Toggle */}
          <button
            type="button"
            onClick={() => setIsMuted((m) => !m)}
            title={isMuted ? "Unmute Voiceover" : "Mute Voiceover"}
            className="rounded-lg border border-slate-800 bg-navy-900/80 p-1.5 text-slate-400 hover:text-slate-200"
          >
            {isMuted ? <VolumeX className="h-3.5 w-3.5 text-rose-400" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>

          {/* Speed Selector */}
          <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-navy-900/80 px-2 py-1 text-[11px] text-slate-300 font-mono">
            <span>Speed:</span>
            {[1.0, 1.25, 1.5].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => setPlaybackRate(rate)}
                className={`rounded px-1 text-[10px] ${
                  playbackRate === rate ? "bg-indigo-500 font-bold text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
