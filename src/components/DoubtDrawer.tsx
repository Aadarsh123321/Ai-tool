import React, { useState } from 'react';
import { MessageSquare, X, Send, Sparkles, HelpCircle, CornerDownRight, Mic } from 'lucide-react';
import { ChatMessage } from '../types';

interface DoubtDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  chatMessages: ChatMessage[];
  onAskDoubt: (doubtText: string) => Promise<void>;
  isAskingDoubt: boolean;
  currentSubject?: string;
  currentTopic?: string;
}

export const DoubtDrawer: React.FC<DoubtDrawerProps> = ({
  isOpen,
  onClose,
  chatMessages,
  onAskDoubt,
  isAskingDoubt,
  currentSubject = 'Science',
  currentTopic = 'Concept',
}) => {
  const [inputDoubt, setInputDoubt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputDoubt.trim() || isAskingDoubt) return;
    onAskDoubt(inputDoubt);
    setInputDoubt('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-all duration-300">
      {/* 2/4th (50%) screen width drawer */}
      <div 
        id="doubt-drawer-container"
        className="w-full sm:w-2/3 md:w-1/2 lg:w-[48%] h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 border border-sky-500/30 text-sky-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Ask Doubt to AI Tutor</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  Live Voice & Chalk
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {currentSubject} • {currentTopic}
              </p>
            </div>
          </div>
          <button
            id="close-doubt-drawer-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            title="Close Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          {chatMessages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mb-4 shadow-lg shadow-sky-500/10">
                <Sparkles className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-slate-100">Any confusion or doubt in this step?</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm leading-relaxed">
                Type your doubt in natural Hinglish or English. AI Tutor will explain it verbally and write quick chalk annotations on the blackboard!
              </p>

              {/* Suggested Quick Prompts */}
              <div className="flex flex-col gap-2 mt-6 w-full max-w-md">
                {[
                  'Sir, please re-explain this step in simpler terms?',
                  'Why did we apply this specific formula here?',
                  'What is the common shortcut or pitfall for this in JEE/NEET?',
                ].map((doubt, i) => (
                  <button
                    key={i}
                    onClick={() => onAskDoubt(doubt)}
                    className="text-left text-xs p-3 rounded-xl bg-slate-800/70 hover:bg-slate-800 text-sky-300 border border-slate-700/60 hover:border-sky-500/40 transition-all flex items-center justify-between"
                  >
                    <span>&quot;{doubt}&quot;</span>
                    <CornerDownRight className="w-3.5 h-3.5 text-sky-400 shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[85%] ${
                  msg.sender === 'user' ? 'self-end' : 'self-start'
                }`}
              >
                <div
                  className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white rounded-br-none shadow-lg shadow-sky-600/20'
                      : 'bg-slate-800/90 text-slate-100 rounded-bl-none border border-slate-700 shadow-md'
                  }`}
                >
                  <p>{msg.text}</p>
                  {msg.chalkNote && (
                    <div className="mt-3 p-2.5 bg-slate-950/80 rounded-xl border border-sky-500/30 text-sky-300 font-handwriting text-sm">
                      Chalk Note on Board: {msg.chalkNote}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 mt-1 px-1 self-end">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))
          )}

          {isAskingDoubt && (
            <div className="self-start flex items-center gap-2 p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700 text-xs text-sky-300 animate-pulse">
              <Sparkles className="w-4 h-4 text-sky-400 animate-spin" />
              <span>AI Tutor is thinking and speaking...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-slate-800 bg-slate-950/90 flex items-center gap-2">
          <input
            id="doubt-input-field"
            type="text"
            placeholder="Type doubt in Hinglish (e.g. Sir ye step kaise aaya?)"
            value={inputDoubt}
            onChange={(e) => setInputDoubt(e.target.value)}
            disabled={isAskingDoubt}
            className="flex-1 bg-slate-800/90 text-slate-100 text-sm px-4 py-3 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder-slate-400"
          />
          <button
            id="submit-doubt-btn"
            type="submit"
            disabled={!inputDoubt.trim() || isAskingDoubt}
            className="px-4 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg shadow-sky-500/20"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Ask</span>
          </button>
        </form>
      </div>
    </div>
  );
};
