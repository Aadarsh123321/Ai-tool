import React, { useState } from 'react';
import { Lecture, LectureStep } from '../types';
import { History, BookOpen, X, Search, ChevronRight, Sparkles, PlusCircle, Trash2, GraduationCap, CheckCircle2 } from 'lucide-react';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lectures: Lecture[];
  activeLecture: Lecture | null;
  onSelectLecture: (lecture: Lecture) => void;
  onNewLectureClick: () => void;
  currentStepIndex: number;
  onSelectStep: (stepIndex: number) => void;
  onDeleteLecture?: (id: string) => void;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  lectures,
  activeLecture,
  onSelectLecture,
  onNewLectureClick,
  currentStepIndex,
  onSelectStep,
  onDeleteLecture,
}) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'history'>('history');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLectures = lectures.filter(
    (lec) =>
      lec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lec.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lec.topic.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-start bg-black/60 backdrop-blur-sm transition-all duration-300">
      {/* Top-Left Sliding Drawer (Gemini style) */}
      <div 
        id="sidebar-drawer-container"
        className="w-full sm:w-96 md:w-[420px] h-full bg-slate-900 border-r border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-left duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                AI Tutor Workspace
              </h3>
              <span className="text-[10px] font-semibold text-sky-400">
                Elite Learning System
              </span>
            </div>
          </div>

          <button
            id="close-sidebar-drawer-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            title="Close Sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick New Lecture Action Button */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/40">
          <button
            id="sidebar-new-lecture-btn"
            onClick={() => {
              onNewLectureClick();
              onClose();
            }}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Upload Document / Create Lecture</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950/60 p-1.5">
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'history'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Lecture History ({lectures.length})</span>
          </button>

          {activeLecture && (
            <button
              onClick={() => setActiveTab('timeline')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'timeline'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Step Timeline</span>
            </button>
          )}
        </div>

        {/* Tab 1: Lecture History */}
        {activeTab === 'history' && (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {lectures.length > 0 && (
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search previous lectures & topics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-800/80 rounded-xl border border-slate-700/60 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            )}

            {filteredLectures.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400 my-auto">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 mb-3">
                  <History className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-200">No Previous Lectures</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-[240px] leading-relaxed">
                  Lectures are created dynamically when you upload problem photos, notes, or documents!
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {filteredLectures.map((lec) => {
                  const isCurrent = activeLecture?.id === lec.id;
                  return (
                    <div
                      key={lec.id}
                      onClick={() => {
                        onSelectLecture(lec);
                        onClose();
                      }}
                      className={`cursor-pointer p-3.5 rounded-xl border transition-all flex flex-col gap-1.5 ${
                        isCurrent
                          ? 'bg-sky-500/10 border-sky-500/40 ring-1 ring-sky-500/20'
                          : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-700 text-sky-300">
                          {lec.subject}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {lec.steps.length} Steps
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-white line-clamp-1">
                        {lec.title}
                      </h4>

                      <p className="text-[11px] text-slate-400 line-clamp-2">
                        {lec.topic} • {lec.summary}
                      </p>

                      <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-slate-700/40 text-[10px]">
                        <span className="text-slate-400">{lec.targetLevel}</span>
                        <span className="text-sky-400 font-bold flex items-center gap-1">
                          {isCurrent ? 'Active Now' : 'Load Lecture →'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Step Timeline (When a lecture is active) */}
        {activeTab === 'timeline' && activeLecture && (
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">
                {activeLecture.subject} • {activeLecture.topic}
              </span>
              <h3 className="text-sm font-bold text-white mt-0.5 leading-snug">
                {activeLecture.title}
              </h3>
            </div>

            <div className="flex flex-col gap-2">
              {activeLecture.steps.map((step, idx) => {
                const isActive = idx === currentStepIndex;
                return (
                  <button
                    key={step.id}
                    onClick={() => {
                      onSelectStep(idx);
                      onClose();
                    }}
                    className={`text-left p-3 rounded-xl border transition-all flex items-start gap-3 ${
                      isActive
                        ? 'bg-sky-500/15 border-sky-500/50 text-white shadow-md shadow-sky-500/10'
                        : 'bg-slate-800/40 border-slate-700/40 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                        isActive ? 'bg-sky-500 text-white shadow-sm' : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-xs font-bold truncate ${isActive ? 'text-sky-300' : 'text-slate-200'}`}>
                        {step.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                        {step.speech}
                      </p>
                    </div>
                    {isActive && (
                      <span className="shrink-0 text-sky-400 self-center">
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
