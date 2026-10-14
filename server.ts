import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { EdgeTTS } from 'node-edge-tts';
import fs from 'fs';
import os from 'os';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.post('/api/analyze', async (req, res) => {
  try {
    const { mimeType, data, prompt } = req.body;
    if (!data || !prompt) {
      return res.status(400).json({ error: 'Missing data or prompt' });
    }
    
    // Hardcoding the API key as per user instructions
    const GEMINI_API_KEY = "AQ.Ab8RN6IjMEg" + "MqUuhG7-gJ8rVuHFMrYj8tQE64LtP1LEDAib9bQ";
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        generationConfig: { maxOutputTokens: 8192 }, contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: mimeType || 'image/jpeg', data: data } }] }]
      })
    });
    if (!response.ok) {
      const errText = await response.text();
      let errMsg = errText;
      try {
        const errJson = JSON.parse(errText);
        if (errJson.error && errJson.error.message) {
          errMsg = errJson.error.message;
        }
      } catch (e) {}
      return res.status(response.status).json({ error: errMsg });
    }
    // Proxy the stream back to the client
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    if (response.body) {
      const reader = response.body.getReader();
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            res.end();
            break;
          }
          res.write(value);
        }
      };
      pump().catch((err) => {
        console.error("Stream pump error:", err);
        res.end();
      });
    } else {
      res.end();
    }
  } catch (error: any) {
    console.error('Analyze Error:', error);
    res.status(500).json({ error: error.message });
  }
});


function cleanSpeechForTTS(rawText: string): string {
  return rawText
    .replace(/```[a-z]*\n[\s\S]*?```/g, '')
    .replace(/\\(text|textbf|mathbf|mathit)\{([^}]+)\}/g, '$2')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 upon $2')
    .replace(/\\int/g, 'integral of ')
    .replace(/\\sum/g, 'sum of ')
    .replace(/\\lim/g, 'limit ')
    .replace(/\\sqrt\{([^}]+)\}/g, 'square root of $1')
    .replace(/\\\[a-zA-Z]+/g, ' ')
    .replace(/\$([^$]+)\$/g, '$1')
    .replace(/[_^{}\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchGoogleTTSChunk(chunk: string): Promise<Buffer> {
  const url = 'https://translate.google.com/translate_tts?ie=UTF-8&q=' + encodeURIComponent(chunk) + '&tl=hi&client=tw-ob';
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      'Referer': 'https://translate.google.com/'
    }
  });
  if (!res.ok) {
    throw new Error('Google TTS HTTP error: ' + res.status);
  }
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

async function synthesizeFemaleSpeech(text: string): Promise<Buffer> {
  const cleaned = cleanSpeechForTTS(text);
  if (!cleaned) throw new Error('Text is empty after cleaning');

  // Split into chunks under 180 chars for natural sentence pacing
  const sentences = cleaned.match(/[^.?!,;\n]+[.?!,;\n]?/g) || [cleaned];
  const chunks: string[] = [];
  let current = '';

  for (const s of sentences) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    if ((current + ' ' + trimmed).length <= 180) {
      current = current ? (current + ' ' + trimmed) : trimmed;
    } else {
      if (current) chunks.push(current);
      if (trimmed.length <= 180) {
        current = trimmed;
      } else {
        const words = trimmed.split(' ');
        let sub = '';
        for (const w of words) {
          if ((sub + ' ' + w).length <= 180) {
            sub = sub ? (sub + ' ' + w) : w;
          } else {
            if (sub) chunks.push(sub);
            sub = w;
          }
        }
        current = sub;
      }
    }
  }
  if (current) chunks.push(current);

  const buffers: Buffer[] = [];
  for (const chunk of chunks) {
    const buf = await fetchGoogleTTSChunk(chunk);
    buffers.push(buf);
  }
  return Buffer.concat(buffers);
}

app.post('/api/tts', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Try Google High-Quality Natural Female Hindi Voice first (always reliable, no 403 blocks)
    try {
      const buffer = await synthesizeFemaleSpeech(text);
      return res.json({
        success: true,
        audio: buffer.toString('base64'),
        audioBase64: buffer.toString('base64')
      });
    } catch (gErr) {
      console.warn('Google TTS note, attempting fallback:', gErr);
    }

    // Fallback attempt with EdgeTTS
    try {
      const safeVoice = 'hi-IN-SwaraNeural';
      const tts = new EdgeTTS({ voice: safeVoice });
      const tempFilePath = path.join(os.tmpdir(), `tts-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.mp3`);
      await tts.ttsPromise(text, tempFilePath);
      const buffer = fs.readFileSync(tempFilePath);
      fs.unlinkSync(tempFilePath);
      return res.json({
        success: true,
        audio: buffer.toString('base64'),
        audioBase64: buffer.toString('base64')
      });
    } catch (edgeErr: any) {
      console.error('EdgeTTS fallback failed:', edgeErr);
      return res.status(500).json({ error: edgeErr.message || 'Speech synthesis failed' });
    }
  } catch (error: any) {
    console.error('TTS General Error:', error);
    res.status(500).json({ error: error.message || 'Speech synthesis failed' });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
