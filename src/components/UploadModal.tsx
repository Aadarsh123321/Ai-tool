import React, { useState, useRef } from 'react';
import { Upload, Sparkles, X, Loader2, BookCheck, HelpCircle } from 'lucide-react';
import { globalAudioEngine } from '../utils/audioEngine';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateLecture: (params: {
    problemText: string;
    imageBase64?: string;
    mimeType?: string;
    subject: string;
    targetLevel: string;
    voiceTone: string;
  }) => Promise<void>;
  isGenerating: boolean;
  generationProgress: string;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onGenerateLecture,
  isGenerating,
  generationProgress,
}) => {
  const [problemText, setProblemText] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [subject, setSubject] = useState('Physics');
  const [targetLevel, setTargetLevel] = useState('Elite Learning');
  const [voiceTone, setVoiceTone] = useState('Warm Indian Hinglish Mentor');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMimeType(file.type || 'image/jpeg');
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setImageBase64(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSampleSelect = (sample: {
    title: string;
    subject: string;
    level: string;
    text: string;
  }) => {
    setProblemText(sample.text);
    setSubject(sample.subject);
    setTargetLevel(sample.level);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemText && !imageBase64) return;

    globalAudioEngine.unlockAudio();

    await onGenerateLecture({
      problemText,
      imageBase64: imageBase64 || undefined,
      mimeType,
      subject,
      targetLevel,
      voiceTone,
    });
  };

  const SAMPLES = [
    {
      title: 'Incline Plane Projectile Motion',
      subject: 'Physics',
      level: 'Elite Learning',
      text: 'A particle is projected from the base of an incline of angle beta with velocity u at angle alpha to horizontal (alpha > beta). Derive time of flight and range along incline using tilted coordinate axes.',
    },
    {
      title: 'Standard Algebraic Substitution Trick',
      subject: 'Mathematics',
      level: 'Elite Learning',
      text: 'Evaluate: Integral of dx / ( x * (x^n + 1) ). Explain the trick of multiplying numerator and denominator by x^(n-1) to create dt, and derive the shortcut result.',
    },
    {
      title: 'Rolling Without Slipping on Incline',
      subject: 'Physics',
      level: 'Elite Learning',
      text: 'A solid cylinder of mass M and radius R rolls without slipping down an incline of angle theta. Find linear acceleration and minimum coefficient of static friction.',
    },
    {
      title: 'Electrophilic Addition Mechanism',
      subject: 'Chemistry',
      level: 'Elite Learning',
      text: 'Explain Markovnikov addition of HBr to 3,3-dimethylbut-1-ene with 1,2-methyl shift carbocation rearrangement to form major product.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 text-sky-400 border border-sky-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-none">
                AI Tutor • Create Visual Lecture
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Upload problem photo, textbook page, document, or type any concept
              </p>
            </div>
          </div>
          <button
            id="close-upload-modal-btn"
            onClick={onClose}
            disabled={isGenerating}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          {/* File Upload Box */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Upload Document / Photo / Image
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all ${
                imagePreview
                  ? 'border-sky-500/50 bg-sky-500/5'
                  : 'border-slate-700 hover:border-slate-500 bg-slate-800/40 hover:bg-slate-800/80'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              {imagePreview ? (
                <div className="relative w-full max-h-48 flex items-center justify-center overflow-hidden rounded-xl">
                  <img
                    src={imagePreview}
                    alt="Problem Preview"
                    className="max-h-44 object-contain rounded-lg shadow-md"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImagePreview(null);
                      setImageBase64(null);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 text-rose-400 hover:text-white transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center py-2">
                  <div className="p-3 rounded-full bg-slate-800 text-sky-400 mb-2">
                    <Upload className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-200">
                    Click to browse or drop Cengage, Irodov, SL Loney, or NCERT question image
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Supports PNG, JPG, JPEG, PDF docs
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Problem Text Area */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Problem Description / Question Text
            </label>
            <textarea
              rows={3}
              placeholder="E.g. A particle of mass m moves under a central force field... Or type your question in English or Hinglish"
              value={problemText}
              onChange={(e) => setProblemText(e.target.value)}
              className="w-full bg-slate-800/80 rounded-xl border border-slate-700 p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 leading-relaxed resize-none"
            />
          </div>

          {/* Preset Samples Selector */}
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Quick One-Click Test Questions:
            </span>
            <div className="grid grid-cols-2 gap-2">
              {SAMPLES.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSampleSelect(s)}
                  className="text-left p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-xs transition-all flex flex-col"
                >
                  <span className="font-bold text-sky-400 text-[11px] truncate">{s.title}</span>
                  <span className="text-slate-400 text-[10px] truncate">{s.subject} • {s.level}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Subject & Level Selectors */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                Subject
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-slate-800 text-slate-200 text-xs px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="Physics">Physics</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Biology">Biology</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                Target Level
              </label>
              <select
                value={targetLevel}
                onChange={(e) => setTargetLevel(e.target.value)}
                className="w-full bg-slate-800 text-slate-200 text-xs px-3 py-2 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="Elite Learning">Elite Learning (JEE / NEET / Olympiad)</option>
                <option value="Class 11 / Class 12">Class 11 / Class 12</option>
                <option value="Foundation (Class 9-10)">Foundation (Class 9-10)</option>
                <option value="College Science">College Science</option>
              </select>
            </div>
          </div>

          {/* Generating Progress State */}
          {isGenerating && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-500/10 via-indigo-500/10 to-purple-500/10 border border-sky-500/30 flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-sky-400 animate-spin shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-bold text-white">
                  Creating Lecture with Top AI Voice (~20-30s)...
                </p>
                <p className="text-[11px] text-sky-300 mt-0.5 animate-pulse">
                  {generationProgress || 'Analyzing equations & structuring blackboard visual flow...'}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 mt-2">
            <button
              id="cancel-upload-btn"
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition-all"
            >
              Cancel
            </button>

            <button
              id="generate-lecture-submit-btn"
              type="submit"
              disabled={(!problemText && !imageBase64) || isGenerating}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 hover:from-sky-400 hover:to-purple-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Create Lecture & Start Mentoring</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
