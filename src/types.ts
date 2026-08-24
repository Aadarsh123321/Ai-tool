export type VisualCommandType = 
  | 'clear'
  | 'text'
  | 'latex'
  | 'line'
  | 'arrow'
  | 'rect'
  | 'circle'
  | 'sketch'
  | 'highlight'
  | 'point'
  | 'erase';

export interface VisualSketchParams {
  diagramType: 'axes' | 'triangle' | 'parabola' | 'circle_radius' | 'incline_plane' | 'circuit' | 'vector' | 'freehand' | 'pendulum' | 'sine_wave';
  label?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  angle?: number;
  color?: string;
  points?: Array<{ x: number; y: number }>;
}

export interface VisualCommand {
  type: VisualCommandType;
  x?: number;
  y?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  width?: number;
  height?: number;
  radius?: number;
  content?: string;
  color?: string;
  size?: number;
  dashed?: boolean;
  sketch?: VisualSketchParams;
  durationMs?: number;
}

export interface LectureStep {
  id: string;
  title: string;
  speech: string; // The natural Hinglish speech text
  visuals: VisualCommand[];
  pauseAfterMs?: number;
  keyTakeaway?: string;
  explanationFocus?: 'writing' | 'intuition_pause' | 'diagram_sketch';
}

export interface Lecture {
  id: string;
  title: string;
  subject: string;
  topic: string;
  targetLevel: string; // e.g. 'JEE Main / Advanced', 'Class 11 Physics', 'NEET'
  originalQuestion: string;
  imageUrl?: string;
  summary: string;
  steps: LectureStep[];
  thingsToRemember: string[];
  createdAt: number;
}

export type VoiceModelId = 'hi-IN-SwaraNeural';

export interface VoiceSettings {
  voiceModel: VoiceModelId;
  speedRate: number; // 0.85 to 1.15
  pitch: number;
  voiceEngine: 'neural_ai' | 'gemini_tts' | 'edge_neural';
  languageMode: 'hinglish_emotional' | 'hindi_pure' | 'english_indian';
}

export interface BlackboardTheme {
  id: 'dark' | 'green' | 'blue' | 'charcoal';
  name: string;
  bgColor: string;
  gridClass: string;
  borderGlow: string;
  primaryTextColor: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'tutor';
  text: string;
  timestamp: number;
  action?: 'draw_note' | 'answer_doubt' | 'explain_step';
  chalkNote?: string;
  formula?: string;
}
