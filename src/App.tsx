import { generateLectureFromGemini, askDoubtFromGemini } from './utils/geminiClient';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TeachingBoard, THEMES } from './components/TeachingBoard';
import { LectureControls } from './components/LectureControls';
import { SidebarDrawer } from './components/SidebarDrawer';
import { DoubtDrawer } from './components/DoubtDrawer';
import { UploadModal } from './components/UploadModal';
import { Lecture, BlackboardTheme, VoiceSettings, ChatMessage } from './types';
import { globalAudioEngine } from './utils/audioEngine';
import confetti from 'canvas-confetti';
import { auth, db, signInWithGoogle, signOutUser } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { 
  Sparkles, 
  Upload, 
  GraduationCap, 
  Menu,
  MessageSquare,
  Volume2,
  PlusCircle,
  BrainCircuit,
  BookOpen
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  const [lectures, setLectures] = useState<Lecture[]>([]);

  const [activeLecture, setActiveLecture] = useState<Lecture | null>(null);

  const [freeUsageCount, setFreeUsageCount] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem('ai_tutor_free_usage') || '0', 10);
    }
    return 0;
  });

  const [showLandingPage, setShowLandingPage] = useState<boolean>(true);
  const [showPlatformInfo, setShowPlatformInfo] = useState<boolean>(false);

  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [subtitles, setSubtitles] = useState<string>('');
  const [activeWordIndex, setActiveWordIndex] = useState<number>(-1);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [theme, setTheme] = useState<BlackboardTheme>(THEMES[0]);
  
  // Drawers & Modals
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isDoubtDrawerOpen, setIsDoubtDrawerOpen] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isAskingDoubt, setIsAskingDoubt] = useState<boolean>(false);

  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>({
    voiceModel: 'hi-IN-MadhurNeural',
    speedRate: 1.0,
    pitch: 1.0,
    voiceEngine: 'neural_ai',
    languageMode: 'hinglish_emotional',
  });

  const currentStep = activeLecture?.steps?.[currentStepIndex] || activeLecture?.steps?.[0];
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  // Handle Auth State & Sync Lectures
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch user data from Firestore
        const userDocRef = doc(db, 'users', currentUser.uid);
        try {
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.lectures && Array.isArray(data.lectures) && data.lectures.length > 0) {
              setLectures(data.lectures);
              setActiveLecture(data.lectures[0]);
            }
          } else {
            // First time login, save to DB
            await setDoc(userDocRef, {
              name: currentUser.displayName || 'Anonymous',
              email: currentUser.email,
              photoURL: currentUser.photoURL,
              lectures: lectures,
              lastLogin: serverTimestamp()
            }, { merge: true });
          }
        } catch (err) {
          console.error("Error fetching user data:", err);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Save to Firestore
  useEffect(() => {
    if (user && lectures.length > 0) {
      const userDocRef = doc(db, 'users', user.uid);
      setDoc(userDocRef, {
        lectures: lectures
      }, { merge: true }).catch(err => console.error("Error saving to DB:", err));
    }
  }, [lectures, user]);

  // Update subtitles when step or active lecture changes
  useEffect(() => {
    if (currentStep) {
      setSubtitles(currentStep.speech);
      setActiveWordIndex(-1);
    } else {
      setSubtitles('');
    }
  }, [currentStepIndex, activeLecture, currentStep]);

  // Play a specific step with Top AI Voice
  const playStep = useCallback(async (stepIdx: number) => {
    if (!activeLecture || !activeLecture.steps[stepIdx]) return;
    const step = activeLecture.steps[stepIdx];
    const words = step.speech.split(' ');

    // 1. Pre-buffer the subsequent step in the background for zero-delay speech
    if (stepIdx + 1 < activeLecture.steps.length) {
      const nextStep = activeLecture.steps[stepIdx + 1];
      if (nextStep?.speech) {
        globalAudioEngine.prefetchSpeech(nextStep.speech, voiceSettings.voiceModel);
      }
    }

    try {
      // 2. Prepare the audio synchronously and get exact duration FIRST
      const speechPrep = await globalAudioEngine.prepareSpeech(step.speech, {
        rate: voiceSettings.speedRate * playbackSpeed,
        pitch: voiceSettings.pitch,
        voiceName: voiceSettings.voiceModel,
        onWordBoundary: (charIdx) => {
          const textBefore = step.speech.substring(0, charIdx);
          const currentWordCount = textBefore.trim().split(/\s+/).length - 1;
          setActiveWordIndex(Math.min(currentWordCount, words.length - 1));
        },
        onEnd: () => {
          setIsSpeaking(false);
          setActiveWordIndex(words.length - 1);

          // Advance to next step if playing continuously
          if (isPlayingRef.current) {
            if (stepIdx < activeLecture.steps.length - 1) {
              const pauseTime = (step.pauseAfterMs || 800) / playbackSpeed;
              setTimeout(() => {
                if (isPlayingRef.current) {
                  playStep(stepIdx + 1);
                }
              }, pauseTime);
            } else {
              setIsPlaying(false);
              confetti({
                particleCount: 120,
                spread: 80,
                origin: { y: 0.6 },
              });
            }
          }
        },
      });

      // 3. Now trigger state update (which starts blackboard drawing) with exact duration
      setCurrentStepIndex(stepIdx);
      setSubtitles(step.speech);
      setIsSpeaking(true);
      setIsPlaying(true);
      setActiveWordIndex(0);

      // 4. Play the audio buffer in exact sync
      speechPrep.play();
    } catch (err) {
      console.warn('Voice playback note:', err);
      setIsSpeaking(false);
      setIsPlaying(false);
    }
  }, [activeLecture, playbackSpeed, voiceSettings]);

  // Toggle Play / Pause
  const handleTogglePlay = () => {
    if (!activeLecture) {
      setIsUploadModalOpen(true);
      return;
    }

    if (isPlaying) {
      setIsPlaying(false);
      setIsSpeaking(false);
      globalAudioEngine.stopAll();
    } else {
      setIsPlaying(true);
      playStep(currentStepIndex);
    }
  };

  // Restart Lecture
  const handleRestart = () => {
    if (!activeLecture) return;
    globalAudioEngine.stopAll();
    setIsPlaying(false);
    setIsSpeaking(false);
    setCurrentStepIndex(0);
    setTimeout(() => {
      setIsPlaying(true);
      playStep(0);
    }, 150);
  };

  // Step Navigation
  const handlePrevStep = () => {
    if (!activeLecture || currentStepIndex <= 0) return;
    globalAudioEngine.stopAll();
    const prevIdx = currentStepIndex - 1;
    setCurrentStepIndex(prevIdx);
    if (isPlaying) {
      playStep(prevIdx);
    }
  };

  const handleNextStep = () => {
    if (!activeLecture || currentStepIndex >= activeLecture.steps.length - 1) return;
    globalAudioEngine.stopAll();
    const nextIdx = currentStepIndex + 1;
    setCurrentStepIndex(nextIdx);
    if (isPlaying) {
      playStep(nextIdx);
    }
  };

  const handleSelectStep = (idx: number) => {
    if (!activeLecture) return;
    globalAudioEngine.stopAll();
    setCurrentStepIndex(idx);
    playStep(idx);
  };

  // Select another lecture from history
  const handleSelectLecture = (lecture: Lecture) => {
    globalAudioEngine.stopAll();
    setActiveLecture(lecture);
    setCurrentStepIndex(0);
    setIsPlaying(true);
    setTimeout(() => {
      playStep(0);
    }, 200);
  };

  // Handle Asking Doubts
  const handleAskDoubt = async (doubtText: string) => {
    setIsAskingDoubt(true);
    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text: doubtText,
      timestamp: Date.now(),
    };
    setChatMessages((prev) => [...prev, userMsg]);

    try {
      const data = await askDoubtFromGemini({
        question: doubtText,
        currentStepTitle: currentStep?.title,
        currentStepSpeech: currentStep?.speech,
        lectureTitle: activeLecture?.title,
      });

      if (data) {
        const tutorMsg: ChatMessage = {
          id: 'msg-' + (Date.now() + 1),
          sender: 'tutor',
          text: data.speech || 'Dekho beta, ye concept bohot simple hai! Dhyan se suno.',
          chalkNote: data.chalkNote,
          formula: data.formula,
          timestamp: Date.now(),
        };
        setChatMessages((prev) => [...prev, tutorMsg]);

        // Speak the mentor's answer using the selected top AI voice
        globalAudioEngine.playTextWithNaturalVoice(tutorMsg.text, {
          rate: voiceSettings.speedRate,
          pitch: voiceSettings.pitch,
          voiceName: voiceSettings.voiceModel,
        });
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: 'msg-' + Date.now(),
        sender: 'tutor',
        text: 'Arey beta, main sun raha hu. Ek baar dobara pucho please!',
        timestamp: Date.now(),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsAskingDoubt(false);
    }
  };

  // Handle AI Lecture Generation
  const handleGenerateLecture = async (params: {
    problemText: string;
    imageBase64?: string;
    mimeType?: string;
    subject: string;
    targetLevel: string;
    voiceTone: string;
  }) => {
    if (!user && freeUsageCount >= 5) {
      alert("You have reached the limit of 5 free lectures. Please sign in with Google to create more and save your history forever.");
      return;
    }

    setIsGenerating(true);
    setGenerationProgress('1. Reading document & analyzing problem statement...');

    const progressTimer = setTimeout(() => {
      setGenerationProgress('2. Crafting step-by-step KaTeX math & blackboard diagram coordinates...');
    }, 4000);

    const progressTimer2 = setTimeout(() => {
      setGenerationProgress('3. Structuring modern, highly intelligent voice speech...');
    }, 8500);

    try {
      const generatedData = await generateLectureFromGemini(params);
      
      const newLec: Lecture = {
        id: "lec-" + Date.now(),
        title: generatedData.title,
        steps: generatedData.steps,
        originalQuestion: params.problemText,
        createdAt: Date.now()
      };
      
      if (!user) {
        const newCount = freeUsageCount + 1;
        setFreeUsageCount(newCount);
        if (typeof window !== 'undefined') {
          localStorage.setItem('ai_tutor_free_usage', newCount.toString());
        }
      }

      setLectures((prev) => [newLec, ...prev]);
      setActiveLecture(newLec);
      setCurrentStepIndex(0);
      setIsUploadModalOpen(false);

      // Auto start mentoring!
      setTimeout(() => {
        setIsPlaying(true);
        playStep(0);
      }, 400);
    } catch (err: any) {
      alert('Error creating lecture: ' + err.message);
    } finally {
      clearTimeout(progressTimer);
      clearTimeout(progressTimer2);
      setIsGenerating(false);
    }
  };

  if (showLandingPage) {
    return (
      <div className="min-h-screen bg-[#050914] text-slate-100 flex flex-col items-center justify-center relative overflow-hidden" style={{ backgroundImage: 'radial-gradient(circle at center, #0f172a 0%, #050914 100%)' }}>
        {/* Animated Background Grid */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(#38bdf8 1px, transparent 1px), linear-gradient(90deg, #38bdf8 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        
        <div className="z-10 text-center max-w-3xl px-6 relative">
          <h2 className="text-sky-500 font-bold tracking-[0.2em] text-sm md:text-base uppercase mb-6 animate-pulse">
            Welcome to the Matrix
          </h2>
          <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-sky-100 to-sky-300 mb-8 tracking-tight">
            Elevate Your Learning
          </h1>
          <p className="text-lg md:text-xl text-slate-400 font-medium mb-12 leading-relaxed max-w-2xl mx-auto">
            Experience a seamless, user-centric practice environment meticulously crafted for aspirants. AI model makes learning easy and conquers standard references.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <button
              onClick={() => {
                setShowLandingPage(false);
                setIsUploadModalOpen(true);
              }}
              className="px-8 py-4 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg shadow-[0_0_40px_rgba(37,99,235,0.4)] hover:shadow-[0_0_60px_rgba(37,99,235,0.6)] transition-all transform hover:-translate-y-1"
            >
              Start Learning
            </button>
            <button
              onClick={() => setShowPlatformInfo(true)}
              className="px-8 py-4 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-lg transition-all"
            >
              Platform Info
            </button>
          </div>
        </div>

        {/* Platform Info Modal */}
        {showPlatformInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#111827] border border-slate-800 rounded-2xl p-8 max-w-2xl w-full relative shadow-2xl">
              <button 
                onClick={() => setShowPlatformInfo(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full"
              >
                ✕
              </button>
              <h2 className="text-3xl font-bold text-white mb-6 text-center">About The Platform</h2>
              <p className="text-slate-300 text-lg leading-relaxed text-center mb-6">
                Hello, I am AADARSH currently I'm building this site, Creating user-centric solutions for a better tomorrow.
              </p>
              <p className="text-slate-400 text-base leading-relaxed text-center">
                This platform is dedicated to rigorous preparation. Here, you will find meticulously digitized chapters and completely interactive Black Book lectures. Click on 'Start Learning' to resume exactly where you left off or create new knowledge matrices.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090d14] text-slate-100 flex flex-col antialiased">
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Left: Top-Left Collapsible Sidebar Toggle & Brand */}
          <div className="flex items-center gap-3">
            <button
              id="top-left-sidebar-toggle-btn"
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-all shadow-sm flex items-center gap-2"
              title="Open Lecture History & Navigation"
            >
              <Menu className="w-5 h-5 text-sky-400" />
              <span className="hidden sm:inline text-xs font-semibold">History</span>
            </button>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 p-0.5 shadow-md shadow-sky-500/20">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <BrainCircuit className="w-4 h-4 text-sky-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-extrabold text-white tracking-tight">
                    AI Tutor
                  </h1>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    Elite Learning
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  Natural Hinglish Voice &amp; Blackboard Visualizer
                </p>
              </div>
            </div>
          </div>

          {/* Right: User Auth & Quick Upload Button */}
          <div className="flex items-center gap-2.5">
            {user ? (
              <div className="flex items-center gap-2 mr-2">
                <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'U'}`} alt="Profile" className="w-8 h-8 rounded-full border border-sky-500/30" />
                <button 
                  onClick={signOutUser}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-red-400 hover:bg-slate-800 hover:text-red-300 text-xs font-bold transition-all"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-sky-500/50 text-sky-400 hover:bg-slate-800 text-xs font-bold transition-all mr-2"
              >
                Sign In with Google
              </button>
            )}

            <button
              id="upload-lecture-btn"
              onClick={() => setIsUploadModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 hover:from-sky-400 hover:to-purple-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-sky-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>Create Lecture</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Learning Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-4 relative">
        {/* Active Lecture Header or Welcome Banner */}
        {activeLecture ? (
          <div className="flex items-center justify-between bg-slate-900/70 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-800/80">
            <div className="flex items-center gap-3">
              <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30">
                {activeLecture.subject}
              </span>
              <h2 className="text-sm font-bold text-slate-100 truncate max-w-md sm:max-w-xl">
                {activeLecture.title}
              </h2>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="hidden sm:inline font-medium text-slate-300">
                {activeLecture.topic}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px] font-semibold">
                {activeLecture.steps.length} Steps
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-slate-800/80 text-center flex flex-col items-center justify-center my-auto min-h-[480px]">
            <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-4 shadow-xl shadow-sky-500/10">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-extrabold text-white">
              Welcome to AI Tutor • Elite Learning
            </h2>
            <p className="text-sm text-slate-400 mt-2 max-w-md leading-relaxed">
              No pre-created lectures loaded. Upload a document, textbook photo, or Cengage/Irodov problem to synthesize your visual blackboard lecture in seconds!
            </p>
            <button
              id="welcome-create-lecture-btn"
              onClick={() => setIsUploadModalOpen(true)}
              className="mt-6 px-6 py-3 rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 hover:from-sky-400 hover:to-purple-500 text-white font-bold text-sm flex items-center gap-2 shadow-xl shadow-sky-500/30 hover:scale-105 active:scale-95 transition-all"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Upload Document &amp; Create Lecture</span>
            </button>
          </div>
        )}

        {/* Blackboard & Controls (When lecture is active) */}
        {activeLecture && (
          <>
            <div className="relative">
              {/* Teaching Blackboard with Slow Sync Pen Speed & Seek */}
              <TeachingBoard
                currentVisuals={currentStep?.visuals || []}
                isSpeaking={isSpeaking}
                theme={theme}
                onThemeChange={setTheme}
                audioProgress={0}
                lectureTitle={activeLecture.title}
                stepTitle={currentStep?.title || ''}
                penSpeedMultiplier={playbackSpeed}
                onSeekPrev={handlePrevStep}
                onSeekNext={handleNextStep}
              />

              {/* Floating Doubt Button on the Side of Learning Board */}
              <button
                id="floating-doubt-trigger-btn"
                onClick={() => setIsDoubtDrawerOpen(true)}
                className="absolute right-4 bottom-4 z-20 px-4 py-2.5 rounded-full bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-xl shadow-sky-500/30 hover:scale-105 active:scale-95 transition-all border border-sky-400/30"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Ask Doubt (2/4 Screen)</span>
              </button>
            </div>

            {/* Playback Controls & Subtitles */}
            <LectureControls
              isPlaying={isPlaying}
              onTogglePlay={handleTogglePlay}
              onRestart={handleRestart}
              onPrevStep={handlePrevStep}
              onNextStep={handleNextStep}
              currentStepIndex={currentStepIndex}
              totalSteps={activeLecture.steps.length}
              subtitles={subtitles}
              activeWordIndex={activeWordIndex}
              voiceSettings={voiceSettings}
              onVoiceSettingsChange={setVoiceSettings}
              playbackSpeed={playbackSpeed}
              onSpeedChange={setPlaybackSpeed}
            />
          </>
        )}
      </main>

      {/* Top-Left Collapsible History Sidebar (Gemini style drawer) */}
      <SidebarDrawer
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        lectures={lectures}
        activeLecture={activeLecture}
        onSelectLecture={handleSelectLecture}
        onNewLectureClick={() => setIsUploadModalOpen(true)}
        currentStepIndex={currentStepIndex}
        onSelectStep={handleSelectStep}
      />

      {/* 2/4th Screen Floating Doubt Drawer */}
      <DoubtDrawer
        isOpen={isDoubtDrawerOpen}
        onClose={() => setIsDoubtDrawerOpen(false)}
        chatMessages={chatMessages}
        onAskDoubt={handleAskDoubt}
        isAskingDoubt={isAskingDoubt}
        currentSubject={activeLecture?.subject}
        currentTopic={activeLecture?.topic}
      />

      {/* Upload Problem & Document Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onGenerateLecture={handleGenerateLecture}
        isGenerating={isGenerating}
        generationProgress={generationProgress}
      />
    </div>
  );
}
