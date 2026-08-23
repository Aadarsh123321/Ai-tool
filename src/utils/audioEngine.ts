// Top-Tier AI Voice Engine for AI Tutor
// High-Fidelity Neural Audio Engine with hardware-accelerated decoding, audio pre-caching & natural speech sync

export class AudioEngine {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isSpeaking: boolean = false;
  private playSessionId: number = 0;
  private naturalVoice: SpeechSynthesisVoice | null = null;
  private audioCache: Map<string, AudioBuffer> = new Map();
  private pendingFetches: Map<string, Promise<AudioBuffer | null>> = new Map();

  constructor() {
    this.initNaturalVoice();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        this.initNaturalVoice();
      };
    }
  }

  private initNaturalVoice() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return;

    // Best available browser neural voice for extreme fallback
    const indianVoice = voices.find(v => 
      (v.lang === 'hi-IN' || v.lang === 'en-IN') && 
      (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Google') || v.name.includes('Neerja'))
    ) || voices.find(v => v.lang === 'hi-IN' || v.lang === 'en-IN') 
      || voices.find(v => v.name.includes('Natural') || v.name.includes('Neural'))
      || voices.find(v => v.lang.startsWith('en')) 
      || voices[0];

    this.naturalVoice = indianVoice || null;
  }

  public unlockAudio() {
    try {
      const ctx = this.getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.resume();
      }
    } catch (_) {}
  }

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 64;
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public stopAll() {
    this.playSessionId++; // Invalidate any running session
    this.isSpeaking = false;

    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch (_) {}
      this.currentSource = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (_) {}
    }
    this.currentUtterance = null;
  }

  // Pre-fetch upcoming lecture steps in the background for zero-latency instant human speech
  public async prefetchSpeech(text: string, voice: string = 'hi-IN-MadhurNeural'): Promise<void> {
    if (!text || text.trim().length === 0) return;
    const cacheKey = `${voice}_${text.trim()}`;
    if (this.audioCache.has(cacheKey) || this.pendingFetches.has(cacheKey)) return;

    const fetchPromise = (async () => {
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice }),
        });
        const data = await res.json();
        if (data.success && data.audioBase64) {
          const buffer = await this.decodeBase64Audio(data.audioBase64);
          if (buffer) {
            this.audioCache.set(cacheKey, buffer);
            return buffer;
          }
        }
      } catch (err) {
        console.warn('Prefetch note:', err);
      } finally {
        this.pendingFetches.delete(cacheKey);
      }
      return null;
    })();

    this.pendingFetches.set(cacheKey, fetchPromise);
  }

  private async decodeBase64Audio(base64: string): Promise<AudioBuffer | null> {
    try {
      const ctx = this.getAudioContext();
      const binary = atob(base64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      // Hardware-accelerated native audio decoding for MP3/WAV
      return await ctx.decodeAudioData(bytes.buffer.slice(0));
    } catch (err) {
      console.warn('Audio decoding fallback to raw PCM', err);
      try {
        const ctx = this.getAudioContext();
        const binary = atob(base64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const int16Array = new Int16Array(bytes.buffer);
        const audioBuffer = ctx.createBuffer(1, int16Array.length, 24000);
        const channelData = audioBuffer.getChannelData(0);
        for (let i = 0; i < int16Array.length; i++) {
          channelData[i] = int16Array[i] / 32768.0;
        }
        return audioBuffer;
      } catch (pcmErr) {
        console.error('PCM conversion failed:', pcmErr);
        return null;
      }
    }
  }

  public async prepareSpeech(
    text: string,
    options: {
      rate?: number;
      pitch?: number;
      voiceName?: string;
      onWordBoundary?: (charIndex: number, textLength: number) => void;
      onEnd?: () => void;
    } = {}
  ): Promise<{ durationMs: number; play: () => void }> {
    this.stopAll();
    const sessionId = this.playSessionId;
    this.isSpeaking = true;

    const rate = options.rate || 1.0;
    const pitch = options.pitch || 1.0;
    const voice = options.voiceName || 'hi-IN-MadhurNeural';
    const cacheKey = `${voice}_${text.trim()}`;

    let audioBuffer = this.audioCache.get(cacheKey);

    if (!audioBuffer && this.pendingFetches.has(cacheKey)) {
      audioBuffer = (await this.pendingFetches.get(cacheKey)) || undefined;
    }

    if (!audioBuffer) {
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voice, rate, pitch }),
        });
        const data = await res.json();
        if (data.success && data.audioBase64) {
          audioBuffer = (await this.decodeBase64Audio(data.audioBase64)) || undefined;
          if (audioBuffer) {
            this.audioCache.set(cacheKey, audioBuffer);
          }
        }
      } catch (e) {
        console.warn('Server AI voice fetch note:', e);
      }
    }

    if (sessionId !== this.playSessionId) {
      return { durationMs: 0, play: () => {} };
    }

    if (audioBuffer) {
      const playbackRate = Math.max(0.75, Math.min(1.5, rate));
      const durationMs = (audioBuffer.duration / playbackRate) * 1000;
      
      return {
        durationMs,
        play: () => {
          if (sessionId !== this.playSessionId) return;
          this.playAudioBuffer(audioBuffer!, sessionId, text, rate, options);
        }
      };
    }

    // Fallback Web Speech
    const estimatedMs = Math.max(1500, text.length * 68);
    return {
      durationMs: estimatedMs,
      play: () => {
        if (sessionId !== this.playSessionId) return;
        this.playWithWebSpeech(text, rate, pitch, sessionId, options);
      }
    };
  }

  public async playTextWithNaturalVoice(
    text: string,
    options: {
      rate?: number;
      pitch?: number;
      voiceName?: string;
      onWordBoundary?: (charIndex: number, textLength: number) => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    } = {}
  ): Promise<{ durationMs: number }> {
    this.stopAll();
    const sessionId = this.playSessionId;
    this.isSpeaking = true;

    const rate = options.rate || 1.0;
    const pitch = options.pitch || 1.0;
    const voice = options.voiceName || 'hi-IN-MadhurNeural';
    const cacheKey = `${voice}_${text.trim()}`;

    // 1. Check if audio is already cached in memory
    let audioBuffer = this.audioCache.get(cacheKey);

    if (!audioBuffer && this.pendingFetches.has(cacheKey)) {
      audioBuffer = (await this.pendingFetches.get(cacheKey)) || undefined;
    }

    if (sessionId !== this.playSessionId) {
      return { durationMs: 0 };
    }

    // 2. Fetch from Top AI Neural Voice backend if not cached
    if (!audioBuffer) {
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            voice,
            rate,
            pitch,
          }),
        });

        if (sessionId !== this.playSessionId) {
          return { durationMs: 0 };
        }

        const data = await res.json();
        if (data.success && data.audioBase64) {
          audioBuffer = (await this.decodeBase64Audio(data.audioBase64)) || undefined;
          if (audioBuffer) {
            this.audioCache.set(cacheKey, audioBuffer);
          }
        }
      } catch (e) {
        console.warn('Server AI voice fetch note:', e);
      }
    }

    if (sessionId !== this.playSessionId) {
      return { durationMs: 0 };
    }

    // 3. Play decoded studio-quality AI Voice Audio
    if (audioBuffer) {
      return this.playAudioBuffer(audioBuffer, sessionId, text, rate, options);
    }

    // 4. Fallback to browser speech only if network completely unavailable
    return this.playWithWebSpeech(text, rate, pitch, sessionId, options);
  }

  private async playAudioBuffer(
    buffer: AudioBuffer,
    sessionId: number,
    text: string,
    playbackRate: number,
    options: {
      onWordBoundary?: (charIndex: number, textLength: number) => void;
      onEnd?: () => void;
    }
  ): Promise<{ durationMs: number }> {
    const ctx = this.getAudioContext();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = Math.max(0.75, Math.min(1.5, playbackRate));

    if (this.analyser) {
      source.connect(this.analyser);
      this.analyser.connect(ctx.destination);
    } else {
      source.connect(ctx.destination);
    }

    this.currentSource = source;
    const durationMs = (buffer.duration / source.playbackRate.value) * 1000;

    // Word boundary tracking for synced blackboard writing
    const words = text.split(' ');
    const wordInterval = Math.max(80, durationMs / Math.max(words.length, 1));
    let wordIdx = 0;
    const wordTimer = setInterval(() => {
      if (sessionId !== this.playSessionId || wordIdx >= words.length) {
        clearInterval(wordTimer);
        return;
      }
      const charIndex = text.indexOf(words[wordIdx]);
      if (charIndex >= 0 && options.onWordBoundary) {
        options.onWordBoundary(charIndex, text.length);
      }
      wordIdx++;
    }, wordInterval);

    return new Promise((resolve) => {
      source.onended = () => {
        clearInterval(wordTimer);
        if (sessionId === this.playSessionId) {
          this.isSpeaking = false;
          options.onEnd?.();
          resolve({ durationMs });
        }
      };
      source.start(0);
    });
  }

  private playWithWebSpeech(
    text: string,
    rate: number,
    pitch: number,
    sessionId: number,
    options: {
      onWordBoundary?: (charIndex: number, textLength: number) => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    }
  ): Promise<{ durationMs: number }> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        const estimatedMs = Math.max(1500, text.length * 68);
        setTimeout(() => {
          if (sessionId === this.playSessionId) {
            this.isSpeaking = false;
            options.onEnd?.();
          }
          resolve({ durationMs: estimatedMs });
        }, estimatedMs);
        return;
      }

      this.initNaturalVoice();
      const utterance = new SpeechSynthesisUtterance(text);
      if (this.naturalVoice) {
        utterance.voice = this.naturalVoice;
      }

      utterance.rate = Math.max(0.85, Math.min(1.15, rate));
      utterance.pitch = Math.max(0.9, Math.min(1.1, pitch));
      utterance.volume = 1.0;

      const estimatedDurationMs = Math.max(1200, (text.length * 72) / utterance.rate);

      utterance.onboundary = (event) => {
        if (sessionId === this.playSessionId && options.onWordBoundary && typeof event.charIndex === 'number') {
          options.onWordBoundary(event.charIndex, text.length);
        }
      };

      utterance.onend = () => {
        if (sessionId === this.playSessionId) {
          this.isSpeaking = false;
          options.onEnd?.();
          resolve({ durationMs: estimatedDurationMs });
        }
      };

      utterance.onerror = (err) => {
        console.warn('Speech engine fallback note:', err);
        if (sessionId === this.playSessionId) {
          this.isSpeaking = false;
          options.onEnd?.();
          resolve({ durationMs: estimatedDurationMs });
        }
      };

      this.currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    });
  }
}

export const globalAudioEngine = new AudioEngine();
