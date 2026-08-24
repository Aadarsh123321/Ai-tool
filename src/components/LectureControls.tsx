import React, { useState } from 'react';
import { Play, Pause, RotateCcw, SkipBack, SkipForward, Volume2, Sparkles, ChevronDown } from 'lucide-react';
import { VoiceSettings, VoiceModelId } from '../types';

interface LectureControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  onPrevStep: () => void;
  onNextStep: () => void;
  currentStepIndex: number;
  totalSteps: number;
  subtitles: string;
  activeWordIndex?: number;
  voiceSettings: VoiceSettings;
  onVoiceSettingsChange: (settings: VoiceSettings) => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
}
export const LectureControls: React.FC<LectureControlsProps> = ({
  isPlaying,
  onTogglePlay,
  onRestart,
  onPrevStep,
  onNextStep,
  currentStepIndex,
  totalSteps,
  subtitles,
  activeWordIndex = -1,
  voiceSettings,
  onVoiceSettingsChange,
  playbackSpeed,
  onSpeedChange,
}) => {
  const [isVoiceDropdownOpen, setIsVoiceDropdownOpen] = useState(false);
  const words = subtitles ? subtitles.split(' ') : [];



  return (
    <div className="w-full flex flex-col gap-3 mt-3">
      {/* Subtitles & Spoken Audio Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/95 to-slate-900/90 border border-slate-800 p-4 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isPlaying ? 'bg-emerald-400' : 'bg-slate-500'} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isPlaying ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Human AI Voice Explanation (Natural Feelings)
            </span>
          </div>

          {/* Static Voice Display */}
          <div className="relative">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-xs text-sky-300 shadow-sm cursor-default">
              <Volume2 className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-bold tracking-wide">Swara Ma'am (Perfect Hinglish)</span>
            </div>
          </div>
        </div>

        {/* Dynamic Spoken Text Display with Karaoke Highlight */}
        <div className="min-h-[52px] flex items-center justify-center text-center px-2 py-1">
          {words.length > 0 ? (
            <p className="text-base sm:text-lg font-bold leading-relaxed text-slate-100 tracking-wide">
              {words.map((word, i) => (
                <span
                  key={i}
                  className={`inline-block mx-1 transition-all duration-150 ${
                    i <= activeWordIndex
                      ? 'text-sky-300 scale-105 drop-shadow-[0_0_10px_rgba(56,189,248,0.6)] font-extrabold'
                      : 'text-slate-300'
                  }`}
                >
                  {word}
                </span>
              ))}
            </p>
          ) : (
            <p className="text-sm italic text-slate-400">
              Upload problem or document to create lecture and start live mentoring.
            </p>
          )}
        </div>
      </div>

      {/* Playback Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800">
        {/* Step Navigation & Play/Pause buttons */}
        <div className="flex items-center gap-2">
          <button
            id="restart-lecture-btn"
            onClick={onRestart}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all shadow-sm"
            title="Restart Lecture from Step 1"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            id="prev-step-btn"
            onClick={onPrevStep}
            disabled={currentStepIndex <= 0}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
            title="Previous Step"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            id="toggle-play-btn"
            onClick={onTogglePlay}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 hover:from-sky-400 hover:to-purple-500 text-white font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-white" />
                <span>Pause Lecture</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Start Mentoring</span>
              </>
            )}
          </button>

          <button
            id="next-step-btn"
            onClick={onNextStep}
            disabled={currentStepIndex >= totalSteps - 1}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
            title="Next Step"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Progress Step Counter */}
          <div className="ml-2 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700/50">
            Step <span className="text-sky-400 font-bold">{totalSteps > 0 ? currentStepIndex + 1 : 0}</span> of {totalSteps}
          </div>
        </div>

        {/* Writing & Speech Pace Control */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">Pace:</span>
          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/50">
            {[0.85, 1.0, 1.15].map((speed) => (
              <button
                key={speed}
                onClick={() => onSpeedChange(speed)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  playbackSpeed === speed
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {speed === 0.85 ? 'Slow' : speed === 1.0 ? 'Normal' : 'Brisk'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
