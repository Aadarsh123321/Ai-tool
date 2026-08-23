import React, { useEffect, useRef, useState, useCallback } from 'react';
import { VisualCommand, VisualSketchParams, BlackboardTheme } from '../types';
import katex from 'katex';
import { Download, Maximize2, Minimize2, Sparkles, PenTool, RotateCcw, RotateCw, ZoomIn, ZoomOut, Eraser } from 'lucide-react';

interface TeachingBoardProps {
  currentVisuals: VisualCommand[];
  isSpeaking: boolean;
  theme: BlackboardTheme;
  onThemeChange: (theme: BlackboardTheme) => void;
  audioProgress: number; // 0 to 1
  lectureTitle: string;
  stepTitle: string;
  penSpeedMultiplier?: number;
  onSeekPrev?: () => void;
  onSeekNext?: () => void;
  currentStepIndex?: number;
  totalSteps?: number;
}

export const THEMES: BlackboardTheme[] = [
  {
    id: 'dark',
    name: 'Dark Slate',
    bgColor: '#0b0f19',
    gridClass: 'blackboard-pattern-dark',
    borderGlow: 'rgba(56, 189, 248, 0.25)',
    primaryTextColor: '#ffffff',
  },
  {
    id: 'green',
    name: 'Classic Chalkboard',
    bgColor: '#061a14',
    gridClass: 'blackboard-pattern-green',
    borderGlow: 'rgba(74, 222, 128, 0.25)',
    primaryTextColor: '#f0fdf4',
  },
  {
    id: 'blue',
    name: 'Deep Navy',
    bgColor: '#081325',
    gridClass: 'blackboard-pattern-blue',
    borderGlow: 'rgba(14, 165, 233, 0.3)',
    primaryTextColor: '#f0f9ff',
  },
  {
    id: 'charcoal',
    name: 'Charcoal Minimal',
    bgColor: '#111318',
    gridClass: 'blackboard-pattern-dark',
    borderGlow: 'rgba(168, 85, 247, 0.25)',
    primaryTextColor: '#fafafa',
  },
];

export const TeachingBoard: React.FC<TeachingBoardProps> = ({
  currentVisuals,
  isSpeaking,
  theme,
  onThemeChange,
  audioProgress,
  lectureTitle,
  stepTitle,
  penSpeedMultiplier = 1.0,
  onSeekPrev,
  onSeekNext,
  currentStepIndex = 0,
  totalSteps = 1,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const penRef = useRef<HTMLDivElement>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [studentChalkColor, setStudentChalkColor] = useState('#38bdf8');
  const [studentChalkSize, setStudentChalkSize] = useState(3);
  const isUserDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  // Double tap seek ripple state (YouTube style)
  const [seekRipple, setSeekRipple] = useState<{ side: 'left' | 'right'; active: boolean } | null>(null);
  const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });

  // Native virtual blackboard coordinate space
  const VIRTUAL_WIDTH = 1000;
  const VIRTUAL_HEIGHT = 520;

  // Double tap handler for seek
  const handleBoardClickOrTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDrawingMode) return;
    const now = Date.now();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clickX = e.clientX - rect.left;
    const isLeft = clickX < rect.width * 0.4;
    const isRight = clickX > rect.width * 0.6;

    if (now - lastTapRef.current.time < 350) {
      // Double tap detected
      if (isLeft && onSeekPrev) {
        onSeekPrev();
        setSeekRipple({ side: 'left', active: true });
        setTimeout(() => setSeekRipple(null), 700);
      } else if (isRight && onSeekNext) {
        onSeekNext();
        setSeekRipple({ side: 'right', active: true });
        setTimeout(() => setSeekRipple(null), 700);
      }
    }

    lastTapRef.current = { time: now, x: clickX };
  };

  // Render Visuals when currentVisuals change
  useEffect(() => {
    const canvas = canvasRef.current;
    const overlay = overlayRef.current;
    const pen = penRef.current;
    if (!canvas || !overlay || !pen) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isCancelled = false;
    const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

    // Clear board and overlay (except pen)
    const clearCanvasAndOverlay = () => {
      ctx.clearRect(0, 0, VIRTUAL_WIDTH, VIRTUAL_HEIGHT);
      Array.from(overlay.children).forEach((child) => {
        const el = child as HTMLElement;
        if (el.id !== 'ai-stylus-pen' && !el.classList.contains('student-drawn')) {
          overlay.removeChild(el);
        }
      });
    };

    // Draw straight or curved line with human pen motion
    const animateLine = async (cmd: VisualCommand, durationMs = 700) => {
      if (isCancelled) return;
      const x1 = cmd.x1 ?? 50;
      const y1 = cmd.y1 ?? 50;
      const x2 = cmd.x2 ?? 200;
      const y2 = cmd.y2 ?? 50;
      const color = cmd.color || '#38bdf8';
      const width = cmd.width || 3;

      pen.style.display = 'block';
      const startTime = performance.now();

      return new Promise<void>(resolve => {
        const step = (timestamp: number) => {
          if (isCancelled) return resolve();
          let progress = (timestamp - startTime) / (durationMs / penSpeedMultiplier);
          if (progress > 1) progress = 1;

          const curX = x1 + (x2 - x1) * progress;
          const curY = y1 + (y2 - y1) * progress;

          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(curX, curY);
          ctx.strokeStyle = color;
          ctx.lineWidth = width;
          ctx.lineCap = 'round';
          if (cmd.dashed) {
            ctx.setLineDash([6, 6]);
          } else {
            ctx.setLineDash([]);
          }
          ctx.shadowBlur = 8;
          ctx.shadowColor = color;
          ctx.stroke();

          // Move pen tip
          pen.style.transform = `translate(${curX}px, ${curY - 35}px)`;

          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            resolve();
          }
        };
        requestAnimationFrame(step);
      });
    };

    // Draw animated box/rectangle
    const animateRect = async (cmd: VisualCommand, durationMs = 600) => {
      if (isCancelled) return;
      const x = cmd.x ?? 50;
      const y = cmd.y ?? 50;
      const w = cmd.width ?? 200;
      const h = cmd.height ?? 80;
      const color = cmd.color || '#4ade80';

      pen.style.display = 'block';
      const startTime = performance.now();

      return new Promise<void>(resolve => {
        const step = (timestamp: number) => {
          if (isCancelled) return resolve();
          let progress = (timestamp - startTime) / (durationMs / penSpeedMultiplier);
          if (progress > 1) progress = 1;

          const totalPerimeter = 2 * (w + h);
          const currentDist = totalPerimeter * progress;

          ctx.strokeStyle = color;
          ctx.lineWidth = 2.5;
          ctx.shadowBlur = 10;
          ctx.shadowColor = color;

          ctx.strokeRect(x, y, w, h);

          pen.style.transform = `translate(${x + Math.min(w, currentDist)}px, ${y - 35}px)`;

          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            resolve();
          }
        };
        requestAnimationFrame(step);
      });
    };

    // Animate complex floating sketch diagrams
    const animateSketch = async (sketch: VisualSketchParams, durationMs = 1200) => {
      if (isCancelled) return;
      const x = sketch.x ?? 100;
      const y = sketch.y ?? 100;
      const w = sketch.width ?? 250;
      const h = sketch.height ?? 150;
      const color = sketch.color || '#94a3b8';

      pen.style.display = 'block';

      if (sketch.diagramType === 'incline_plane') {
        // Draw inclined wedge
        ctx.beginPath();
        ctx.moveTo(x, y + h);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x + w, y);
        ctx.closePath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 6;
        ctx.shadowColor = color;
        ctx.stroke();
        ctx.fillStyle = color + '18';
        ctx.fill();

        // Angle arc
        ctx.beginPath();
        ctx.arc(x, y + h, 42, 0, -Math.PI / 6, true);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label for angle
        ctx.font = '20px Kalam, cursive';
        ctx.fillStyle = '#facc15';
        ctx.fillText(sketch.label || 'θ', x + 50, y + h - 12);

        // Block on incline
        const blockX = x + w * 0.55;
        const blockY = y + h * 0.45;
        ctx.save();
        ctx.translate(blockX, blockY);
        ctx.rotate(-Math.PI / 6);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-25, -20, 50, 40);
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 2;
        ctx.strokeRect(-25, -20, 50, 40);

        // Mass label
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('M', -8, 5);
        ctx.restore();

        // Gravity vector mg downward
        ctx.beginPath();
        ctx.moveTo(blockX, blockY);
        ctx.lineTo(blockX, blockY + 60);
        ctx.strokeStyle = '#f87171';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        // Arrowhead
        ctx.beginPath();
        ctx.moveTo(blockX - 5, blockY + 50);
        ctx.lineTo(blockX, blockY + 60);
        ctx.lineTo(blockX + 5, blockY + 50);
        ctx.stroke();

        ctx.fillStyle = '#f87171';
        ctx.font = '18px Kalam, sans-serif';
        ctx.fillText('M g', blockX + 10, blockY + 55);

        // Normal Force vector
        ctx.beginPath();
        ctx.moveTo(blockX, blockY);
        ctx.lineTo(blockX - 25, blockY - 45);
        ctx.strokeStyle = '#4ade80';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.fillStyle = '#4ade80';
        ctx.fillText('N', blockX - 45, blockY - 40);

        pen.style.transform = `translate(${blockX}px, ${blockY - 35}px)`;
        await sleep(500);
      } else if (sketch.diagramType === 'axes') {
        // Coordinate axes
        ctx.beginPath();
        ctx.moveTo(x, y + h);
        ctx.lineTo(x + w, y + h); // X axis
        ctx.moveTo(x, y + h);
        ctx.lineTo(x, y); // Y axis
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.font = '18px Kalam, sans-serif';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText('X', x + w + 10, y + h + 5);
        ctx.fillText('Y', x - 5, y - 10);
      } else if (sketch.diagramType === 'parabola') {
        // Projectile parabola
        ctx.beginPath();
        ctx.moveTo(x, y + h);
        ctx.quadraticCurveTo(x + w / 2, y - 20, x + w, y + h);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Velocity vector u
        ctx.beginPath();
        ctx.moveTo(x, y + h);
        ctx.lineTo(x + 50, y + h - 50);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = '#38bdf8';
        ctx.font = '20px Kalam, sans-serif';
        ctx.fillText('u (velocity)', x + 55, y + h - 55);
      } else if (sketch.diagramType === 'triangle') {
        ctx.beginPath();
        ctx.moveTo(x, y + h);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x + w / 2, y);
        ctx.closePath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
    };

    // Handwritten text typing with human pace tracking
    const typeText = async (cmd: VisualCommand, durationMs = 1100) => {
      if (isCancelled) return;
      const el = document.createElement('div');
      el.className = 'written-text font-caveat select-none tracking-wide';
      el.style.left = `${cmd.x || 50}px`;
      el.style.top = `${cmd.y || 50}px`;
      el.style.color = cmd.color || theme.primaryTextColor;
      el.style.fontSize = `${cmd.size || 22}px`;
      el.style.fontWeight = '600';
      el.style.position = 'absolute';
      el.style.whiteSpace = 'nowrap';
      el.style.textShadow = `0 0 10px ${cmd.color || '#fff'}40`;
      overlay.appendChild(el);

      const text = cmd.content || '';
      const chars = text.split('');
      // Human paced character delay
      const charDelay = Math.max(18, (durationMs / Math.max(chars.length, 1)) / penSpeedMultiplier);

      pen.style.display = 'block';
      let currentStr = '';

      for (let i = 0; i < chars.length; i++) {
        if (isCancelled) return;
        currentStr += chars[i];
        el.innerText = currentStr;

        const currentWidth = el.getBoundingClientRect().width;
        pen.style.transform = `translate(${(cmd.x || 50) + currentWidth}px, ${(cmd.y || 50) - 20}px)`;

        await sleep(charDelay);
      }
    };

    // LaTeX formula rendering with left-to-right clip wipe reveal
    const wipeLatex = async (cmd: VisualCommand, durationMs = 1300) => {
      if (isCancelled) return;
      const el = document.createElement('div');
      el.className = 'latex-wipe select-none';
      el.style.position = 'absolute';
      el.style.left = `${cmd.x || 50}px`;
      el.style.top = `${cmd.y || 50}px`;
      el.style.color = cmd.color || '#ffffff';
      el.style.fontSize = `${cmd.size || 22}px`;
      el.style.textShadow = `0 0 12px ${cmd.color || '#38bdf8'}50`;
      el.style.clipPath = 'inset(0 100% 0 0)';

      try {
        katex.render(cmd.content || '', el, {
          throwOnError: false,
          displayMode: true,
        });
      } catch (err) {
        el.innerText = cmd.content || '';
      }

      overlay.appendChild(el);
      pen.style.display = 'block';

      // Give DOM a frame to compute KaTeX dimensions
      await sleep(40);
      const fullWidth = Math.max(el.getBoundingClientRect().width, 160);

      const startTime = performance.now();
      const wipeDuration = durationMs / penSpeedMultiplier;

      return new Promise<void>(resolve => {
        const step = (timestamp: number) => {
          if (isCancelled) return resolve();
          let progress = (timestamp - startTime) / wipeDuration;
          if (progress > 1) progress = 1;

          const currentWipe = fullWidth * progress;
          el.style.clipPath = `inset(0 ${Math.max(0, fullWidth - currentWipe)}px 0 0)`;

          pen.style.transform = `translate(${(cmd.x || 50) + currentWipe + 15}px, ${(cmd.y || 50) + 10}px)`;

          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            resolve();
          }
        };
        requestAnimationFrame(step);
      });
    };

    // Execute sequential visual commands
    const runVisuals = async () => {
      for (const cmd of currentVisuals) {
        if (isCancelled) break;

        if (cmd.type === 'clear') {
          clearCanvasAndOverlay();
        } else if (cmd.type === 'line' || cmd.type === 'arrow') {
          await animateLine(cmd, cmd.durationMs || 600);
        } else if (cmd.type === 'rect') {
          await animateRect(cmd, cmd.durationMs || 550);
        } else if (cmd.type === 'sketch' && cmd.sketch) {
          await animateSketch(cmd.sketch, cmd.durationMs || 1100);
        } else if (cmd.type === 'text') {
          await typeText(cmd, cmd.durationMs || 1000);
        } else if (cmd.type === 'latex') {
          await wipeLatex(cmd, cmd.durationMs || 1300);
        }

        // Measured pause matching human breath
        await sleep(75);
      }

      if (!isCancelled) {
        pen.style.transition = 'opacity 0.3s ease';
        pen.style.opacity = '0.3';
      }
    };

    pen.style.opacity = '1';
    clearCanvasAndOverlay(); // Always wipe the board cleanly before drawing a new step's visuals
    runVisuals();

    return () => {
      isCancelled = true;
    };
  }, [currentVisuals, penSpeedMultiplier, theme]);

  // Student Freehand Scribble Support
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = VIRTUAL_WIDTH / rect.width;
    const scaleY = VIRTUAL_HEIGHT / rect.height;

    isUserDrawingRef.current = true;
    lastPosRef.current = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingMode || !isUserDrawingRef.current || !lastPosRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = VIRTUAL_WIDTH / rect.width;
    const scaleY = VIRTUAL_HEIGHT / rect.height;

    const currentX = (e.clientX - rect.left) * scaleX;
    const currentY = (e.clientY - rect.top) * scaleY;

    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(currentX, currentY);
    ctx.strokeStyle = studentChalkColor;
    ctx.lineWidth = studentChalkSize;
    ctx.lineCap = 'round';
    ctx.shadowBlur = 6;
    ctx.shadowColor = studentChalkColor;
    ctx.stroke();

    lastPosRef.current = { x: currentX, y: currentY };
  };

  const handleMouseUp = () => {
    isUserDrawingRef.current = false;
    lastPosRef.current = null;
  };

  // Download snapshot
  const downloadSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${(lectureTitle || 'AI_Tutor_Board').replace(/\s+/g, '_')}_Chalkboard.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      id="teaching-board-container"
      onClick={handleBoardClickOrTap}
      className={`relative w-full rounded-2xl overflow-hidden transition-all duration-300 border border-slate-800 shadow-2xl flex flex-col ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen bg-[#070b12]' : 'min-h-[480px] lg:min-h-[530px]'
      }`}
      style={{
        boxShadow: `0 20px 50px -10px rgba(0, 0, 0, 0.85), inset 0 0 40px rgba(0, 0, 0, 0.6), 0 0 20px ${theme.borderGlow}`,
      }}
    >
      {/* Board Top Header Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block shadow-sm shadow-rose-500/40"></span>
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block shadow-sm shadow-amber-500/40"></span>
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block shadow-sm shadow-emerald-500/40"></span>
          </div>
          <div className="h-4 w-[1px] bg-slate-700 mx-1"></div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              AI Tutor Neural Canvas
            </span>
            <span className="text-sm font-semibold text-slate-100 truncate max-w-[280px] sm:max-w-md">
              {stepTitle || lectureTitle || 'Teaching Canvas Ready'}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Quick Step Seek Buttons (prev / next) */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700/50">
            <button
              id="seek-prev-step-btn"
              onClick={(e) => {
                e.stopPropagation();
                onSeekPrev?.();
              }}
              disabled={currentStepIndex <= 0}
              className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-700 transition-all text-xs flex items-center gap-1"
              title="Previous Step (Double tap left on board)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium hidden md:inline">Prev</span>
            </button>
            <span className="text-[11px] text-slate-400 px-1 font-mono">
              {totalSteps > 0 ? `${currentStepIndex + 1}/${totalSteps}` : '0/0'}
            </span>
            <button
              id="seek-next-step-btn"
              onClick={(e) => {
                e.stopPropagation();
                onSeekNext?.();
              }}
              disabled={currentStepIndex >= totalSteps - 1}
              className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-700 transition-all text-xs flex items-center gap-1"
              title="Next Step (Double tap right on board)"
            >
              <span className="text-[11px] font-medium hidden md:inline">Next</span>
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Theme Selector */}
          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700/50">
            {THEMES.map(t => (
              <button
                key={t.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onThemeChange(t);
                }}
                title={`Blackboard: ${t.name}`}
                className={`px-2 py-1 text-xs rounded transition-all font-medium ${
                  theme.id === t.id
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                {t.name.split(' ')[0]}
              </button>
            ))}
          </div>

          {/* Student Chalk Mode Toggle */}
          <button
            id="student-chalk-toggle-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsDrawingMode(!isDrawingMode);
            }}
            className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              isDrawingMode
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/20'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 border border-slate-700/50'
            }`}
            title="Student Scribble & Notes Mode"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isDrawingMode ? 'Drawing Mode' : 'Chalk'}</span>
          </button>

          {/* Drawing Palette (when drawing mode is active) */}
          {isDrawingMode && (
            <div className="flex items-center gap-1 bg-slate-800/90 px-2 py-1 rounded-lg border border-amber-500/30">
              {['#ffffff', '#38bdf8', '#4ade80', '#facc15', '#f43f5e'].map(c => (
                <button
                  key={c}
                  onClick={(e) => {
                    e.stopPropagation();
                    setStudentChalkColor(c);
                  }}
                  className={`w-4 h-4 rounded-full transition-transform ${
                    studentChalkColor === c ? 'scale-125 ring-2 ring-white shadow-md' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}

          {/* Snapshot Button */}
          <button
            id="export-board-snapshot-btn"
            onClick={(e) => {
              e.stopPropagation();
              downloadSnapshot();
            }}
            className="p-2 rounded-lg bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/50 transition-all"
            title="Export High-Res Chalkboard PNG"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Button */}
          <button
            id="toggle-fullscreen-board-btn"
            onClick={(e) => {
              e.stopPropagation();
              toggleFullscreen();
            }}
            className="p-2 rounded-lg bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700/50 transition-all"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Canvas Viewport (1000x520 aspect ratio) */}
      <div
        className={`relative flex-1 w-full overflow-hidden ${theme.gridClass} select-none`}
        style={{
          backgroundColor: theme.bgColor,
          cursor: isDrawingMode ? 'crosshair' : 'default',
        }}
      >
        {/* Responsive Canvas Wrapper */}
        <div className="relative w-full h-full min-h-[380px] lg:min-h-[460px] flex items-center justify-center">
          <div
            className="relative w-full aspect-[1000/520] max-h-full"
            style={{ width: '100%', height: '100%' }}
          >
            {/* Background Canvas for vector strokes, lines & diagrams */}
            <canvas
              ref={canvasRef}
              width={VIRTUAL_WIDTH}
              height={VIRTUAL_HEIGHT}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="absolute inset-0 w-full h-full object-contain pointer-events-auto"
              style={{ zIndex: 5 }}
            />

            {/* HTML Overlay for KaTeX formulas and handwriting */}
            <div
              ref={overlayRef}
              id="html-overlay"
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{
                zIndex: 10,
                transformOrigin: 'top left',
              }}
            >
              {/* Realistic Stylus Pen / Chalk Cursor */}
              <div
                ref={penRef}
                id="ai-stylus-pen"
                className="absolute pointer-events-none transition-transform duration-75 ease-out"
                style={{
                  width: '38px',
                  height: '38px',
                  zIndex: 50,
                  display: 'none',
                  transformOrigin: '0% 100%',
                  filter: 'drop-shadow(2px 6px 8px rgba(0, 0, 0, 0.75))',
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 512 512"
                  className="w-full h-full"
                >
                  <path fill="#64748b" d="M220.125,248.451c-4.075-4.088-10.69-4.097-14.777-0.022l-0.172,0.172c-4.087,4.074-4.096,10.69-0.022,14.777 c2.041,2.047,4.72,3.071,7.399,3.071c2.669,0,5.338-1.017,7.377-3.049l0.173-0.172C224.19,259.154,224.2,252.537,220.125,248.451z"/>
                  <path fill="#475569" d="M315.784,152.768c-4.081-4.08-10.698-4.08-14.778,0l-71.766,71.766c-4.08,4.081-4.08,10.698,0,14.778 c2.04,2.041,4.715,3.06,7.388,3.06c2.674,0,5.349-1.02,7.389-3.06l71.766-71.766C319.864,163.465,319.864,156.849,315.784,152.768 z"/>
                  <path fill="#38bdf8" d="M497.046,60.678l-45.725-45.725C441.679,5.31,428.86,0,415.223,0c-13.637,0.001-26.458,5.311-36.099,14.954L60.196,333.88 c0.001,0.001,0.003,0.002,0.005,0.002c-1.074,1.073-1.927,2.384-2.46,3.878L0.607,498.042c-1.355,3.801-0.4,8.044,2.453,10.897 C5.054,510.933,7.725,512,10.451,512c1.175,0,2.361-0.199,3.507-0.607l160.282-57.134c1.493-0.532,2.803-1.384,3.877-2.458 c0.001,0.001,0.002,0.002,0.004,0.004l318.925-318.928C506.689,123.235,512,110.415,512,96.778S506.69,70.321,497.046,60.678z M160.283,437.049L42.701,478.962l-9.662-9.662l41.914-117.581h33.758l-0.001,41.123c0,2.771,1.1,5.428,3.06,7.388 c1.96,1.959,4.617,3.06,7.388,3.06l41.125,0.001V437.049z M181.181,419.191v-26.348c0-5.771-4.678-10.449-10.449-10.449 l-41.125-0.001l0.001-41.123c0-2.771-1.101-5.429-3.06-7.388-1.959-1.959-4.617-3.06-7.388-3.06H92.811L332.597,91.034 l88.369,88.369L181.181,419.191z M435.744,164.626l-88.369-88.369l18.965-18.965l0.909-0.91l88.369,88.369L435.744,164.626z M482.268,118.101l-11.873,11.873l-88.369-88.369L393.9,29.73c5.696-5.696,13.268-8.833,21.322-8.833s15.626,3.137,21.322,8.833 l45.726,45.726c5.695,5.696,8.831,13.267,8.831,21.322S487.965,112.406,482.268,118.101z"/>
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* YouTube-Style Double Tap Visual Overlay Feedback */}
        {seekRipple && (
          <div
            className={`absolute top-0 bottom-0 pointer-events-none flex items-center justify-center z-40 transition-opacity ${
              seekRipple.side === 'left' ? 'left-0 w-1/3 bg-white/5' : 'right-0 w-1/3 bg-white/5'
            }`}
          >
            <div className="flex flex-col items-center justify-center p-4 rounded-full bg-slate-900/90 text-sky-400 border border-sky-500/40 shadow-2xl animate-ping duration-500">
              {seekRipple.side === 'left' ? (
                <>
                  <RotateCcw className="w-8 h-8" />
                  <span className="text-xs font-bold mt-1 text-white">Prev Step</span>
                </>
              ) : (
                <>
                  <RotateCw className="w-8 h-8" />
                  <span className="text-xs font-bold mt-1 text-white">Next Step</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Live Speaking Indicator badge at bottom right */}
        {isSpeaking && (
          <div className="absolute bottom-3 right-3 z-30 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-sky-500/40 shadow-lg shadow-sky-500/20">
            <div className="flex items-center gap-0.5 h-3">
              <span className="w-1 bg-sky-400 rounded-full animate-pulse h-3"></span>
              <span className="w-1 bg-sky-400 rounded-full animate-pulse delay-75 h-2"></span>
              <span className="w-1 bg-sky-400 rounded-full animate-pulse delay-150 h-3.5"></span>
              <span className="w-1 bg-sky-400 rounded-full animate-pulse delay-100 h-2"></span>
            </div>
            <span className="text-xs font-semibold text-sky-300">Live Voice Explaining</span>
          </div>
        )}
      </div>
    </div>
  );
};
