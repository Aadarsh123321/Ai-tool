import React, { useState } from 'react';
import { Lecture, LectureStep, ChatMessage } from '../types';
import { History, BookOpen, MessageSquare, Send, Sparkles, CheckCircle2, ChevronRight, Search, Lightbulb, Bookmark } from 'lucide-react';
import katex from 'katex';

interface HistoryAndChatSidebarProps {
  lectures: Lecture[];
  activeLecture: Lecture;
  onSelectLecture: (lecture: Lecture) => void;
  currentStepIndex: number;
  onSelectStep: (stepIndex: number) => void;
  onAskDoubt: (doubtText: string) => Promise<void>;
  chatMessages: ChatMessage[];
  isAskingDoubt: boolean;
}

export const HistoryAndChatSidebar: React.FC<HistoryAndChatSidebarProps> = ({
  lectures,
  activeLecture,
  onSelectLecture,
  currentStepIndex,
  onSelectStep,
  onAskDoubt,
  chatMessages,
  isAskingDoubt,
}) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'history' | 'doubts'>('timeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [inputDoubt, setInputDoubt] = useState('');

  const filteredLectures = lectures.filter(
    (lec) =>
      lec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lec.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lec.topic.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendDoubt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputDoubt.trim() || isAskingDoubt) return;
    onAskDoubt(inputDoubt);
    setInputDoubt('');
  };

  return (
    <div className="w-full lg:w-96 flex flex-col bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-800 shadow-2xl overflow-hidden min-h-[580px] max-h-[820px]">
      {/* Navigation Tabs Header */}
      <div className="flex items-center border-b border-slate-800 bg-slate-950/60 p-1.5">
        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'timeline'
              ? 'bg-gradient-to-r from-sky-500/20 to-indigo-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Timeline</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'history'
              ? 'bg-gradient-to-r from-sky-500/20 to-indigo-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Lecture History</span>
        </button>

        <button
          onClick={() => setActiveTab('doubts')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'doubts'
              ? 'bg-gradient-to-r from-sky-500/20 to-indigo-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Ask Doubt</span>
        </button>
      </div>

      {/* Tab 1: Current Lecture Step Timeline & Guru Mantra */}
      {activeTab === 'timeline' && (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          <div className="mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400">
              {activeLecture.subject} • {activeLecture.targetLevel}
            </span>
            <h3 className="text-base font-extrabold text-white mt-0.5 leading-snug">
              {activeLecture.title}
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {activeLecture.summary}
            </p>
          </div>

          {/* Steps List */}
          <div className="flex flex-col gap-2">
            {activeLecture.steps.map((step, idx) => {
              const isActive = idx === currentStepIndex;
              return (
                <button
                  key={step.id}
                  onClick={() => onSelectStep(idx)}
                  className={`text-left p-3 rounded-xl border transition-all flex items-start gap-3 ${
                    isActive
                      ? 'bg-sky-500/15 border-sky-500/50 text-white shadow-md shadow-sky-500/10'
                      : 'bg-slate-800/40 border-slate-700/40 text-slate-300 hover:bg-slate-800/80 hover:border-slate-600'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                      isActive
                        ? 'bg-sky-500 text-white shadow-sm'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4
                      className={`text-xs font-bold truncate ${
                        isActive ? 'text-sky-300' : 'text-slate-200'
                      }`}
                    >
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

          {/* Guru Mantra / Things to Remember Box */}
          {activeLecture.thingsToRemember && activeLecture.thingsToRemember.length > 0 && (
            <div className="mt-3 p-3.5 rounded-xl bg-gradient-to-br from-rose-950/40 to-slate-900/60 border border-rose-500/30">
              <div className="flex items-center gap-1.5 text-rose-400 font-bold text-xs mb-2">
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Things to Remember (Guru Mantra)</span>
              </div>
              <ul className="flex flex-col gap-1.5 text-xs text-slate-300">
                {activeLecture.thingsToRemember.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-rose-400 font-bold mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Lecture History (1-click Instant Replay) */}
      {activeTab === 'history' && (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search lectures, topics, or JEE problems..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-800/80 rounded-xl border border-slate-700/60 text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Prepared Lectures ({filteredLectures.length})
            </span>
            <span className="text-[11px] text-sky-400 font-medium">Click to Load &amp; Play</span>
          </div>

          {/* Lecture Cards */}
          <div className="flex flex-col gap-2.5">
            {filteredLectures.map((lec) => {
              const isCurrent = lec.id === activeLecture.id;
              return (
                <div
                  key={lec.id}
                  onClick={() => onSelectLecture(lec)}
                  className={`cursor-pointer p-3.5 rounded-xl border transition-all flex flex-col gap-1.5 ${
                    isCurrent
                      ? 'bg-sky-500/10 border-sky-500/40 ring-1 ring-sky-500/20'
                      : 'bg-slate-800/40 border-slate-700/40 hover:bg-slate-800/80 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-700/80 text-sky-300">
                      {lec.subject}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {lec.steps.length} Steps
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-white leading-snug line-clamp-1">
                    {lec.title}
                  </h4>

                  <p className="text-[11px] text-slate-400 line-clamp-2">
                    {lec.originalQuestion || lec.summary}
                  </p>

                  <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-slate-700/40 text-[10px] text-slate-400">
                    <span>{lec.targetLevel}</span>
                    <span className="text-sky-400 font-bold flex items-center gap-1">
                      {isCurrent ? 'Playing Now' : 'Load Lecture →'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Live Ask Doubt / Classroom Assistant */}
      {activeTab === 'doubts' && (
        <div className="flex-1 flex flex-col overflow-hidden p-4">
          <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
            {chatMessages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-slate-400">
                <Sparkles className="w-8 h-8 text-sky-400/60 mb-2" />
                <h4 className="text-xs font-bold text-slate-200">Got a Doubt during the Lecture?</h4>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[220px]">
                  Ask in Hinglish or English. Eduro mentor will answer verbally and write notes on the board!
                </p>
                <div className="flex flex-col gap-1.5 mt-3 w-full">
                  {[
                    'Sir, explain step 2 one more time?',
                    'Why is static friction acting up the incline?',
                    'Can we use substitution t = x^n directly?',
                  ].map((quickDoubt, i) => (
                    <button
                      key={i}
                      onClick={() => onAskDoubt(quickDoubt)}
                      className="text-left text-[11px] p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-sky-300 border border-slate-700/40 transition-all"
                    >
                      &quot;{quickDoubt}&quot;
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-[90%] ${
                    msg.sender === 'user' ? 'self-end' : 'self-start'
                  }`}
                >
                  <div
                    className={`p-3 rounded-2xl text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-sky-600 text-white rounded-br-none'
                        : 'bg-slate-800 text-slate-100 rounded-bl-none border border-slate-700'
                    }`}
                  >
                    <p>{msg.text}</p>
                    {msg.chalkNote && (
                      <div className="mt-2 p-2 bg-slate-900/80 rounded-lg border border-sky-500/30 text-sky-300 font-handwriting text-sm">
                        Chalk Note: {msg.chalkNote}
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-500 mt-0.5 px-1 self-end">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Doubt Input Form */}
          <form onSubmit={handleSendDoubt} className="mt-3 flex items-center gap-2">
            <input
              type="text"
              placeholder="Ask doubt in Hinglish (e.g. Sir ye formula...)"
              value={inputDoubt}
              onChange={(e) => setInputDoubt(e.target.value)}
              disabled={isAskingDoubt}
              className="flex-1 bg-slate-800 text-slate-100 text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder-slate-500"
            />
            <button
              type="submit"
              disabled={!inputDoubt.trim() || isAskingDoubt}
              className="p-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-sky-500/20"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
