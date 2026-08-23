import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { Communicate } from "edge-tts-universal";
import googleTTS from "google-tts-api";
import dotenv from "dotenv";

dotenv.config();

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", aiConfigured: !!process.env.GEMINI_API_KEY });
  });

  // --- 1. AI LECTURE GENERATOR ENDPOINT ---
  app.post("/api/generate-lecture", async (req, res) => {
    try {
      const { problemText, imageBase64, mimeType, subject = "Auto-Detect", targetLevel = "Elite Learning", voiceTone = "Warm Hinglish Mentor" } = req.body;

      if (!problemText && !imageBase64) {
        return res.status(400).json({ error: "Please provide either problem text or an image." });
      }

      const ai = getGeminiClient();
      if (!ai) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured in the environment." });
      }

      const systemInstruction = `
You are AI Tutor, an exceptionally intelligent, modern friend and mentor.
You teach on a high-tech visual blackboard (Coordinate Canvas dimensions: 1000px width by 520px height).

CRITICAL PEDAGOGY & VOICE MANDATES:
1. DEEP SUBJECT & TOPIC ANALYSIS:
   - Carefully analyze the uploaded document, textbook excerpt, question, or photo line-by-line.
   - Accurately detect and extract the exact Subject and Specific Topic/Chapter.
2. MODERN, FRIENDLY, AND INFINITELY DEEP EXPLANATIONS:
   - Speak like a highly intelligent modern friend. Remove all clichés like "dekho beta".
   - Explain concepts at an incredibly deep level, but use the most intuitive, easy-to-understand analogies so ANYONE can grasp it.
   - Separate your thoughts into different paragraphs after a full stop to make the explanation attractive and easy to digest.
3. SYNCHRONIZED VISUAL BLACKBOARD FLOW (CRITICAL RULES):
   - Structure a crystal-clear 4 to 6 step derivation/solution.
   - Blackboard coordinate space is 1000x520 pixels.
   - The first visual command of EVERY step MUST be { type: "clear" } to erase the previous step's contents before writing new ones.
   - Clean spacing: Titles at Y: 35, Equations in main body (Y: 85 to 300).
   - "text": USE EXCLUSIVELY FOR PLAIN ENGLISH TEXT (e.g. titles, labels). NEVER put equations or variables in text. Vary the text colors (e.g., #38bdf8, #fde047, #f43f5e, #a7f3d0) to make it highly attractive.
   - "latex": USE EXCLUSIVELY FOR MATH, EQUATIONS, AND VARIABLES. Formatted with DOUBLE backslashes for KaTeX (e.g. "\\\\int f(x)dx", "\\\\vec{F} = m \\\\vec{a}"). DO NOT use "text" for math.
   - "sketch": ALWAYS include visual drawings/sketches if it helps explain the concept for the best understanding. Diagrams cleanly positioned on the right/center.
   - Do NOT use "rect" command. Never draw boxes around text.
4. FINAL STEP - "THINGS TO REMEMBER":
   - The last step MUST be titled "Things to Remember" summarizing 3-4 golden exam shortcuts and pitfalls to avoid. Use beautiful varied colors and distinct paragraphs.

Return a valid JSON object matching the requested schema.
`;

      const promptText = `
Subject hint: ${subject}
Level: ${targetLevel}
Voice Tone: ${voiceTone}

Student Problem/Document Request:
${problemText || "Please analyze the uploaded document/image in detail, identify the question or topic, and create a complete, crystal-clear 4 to 6 step visual blackboard lecture."}
`;

      const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];
      
      if (imageBase64) {
        const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, "");
        parts.push({
          inlineData: {
            mimeType: mimeType || "image/jpeg",
            data: cleanBase64,
          },
        });
      }
      
      parts.push({ text: promptText });

      let parsedData: any = null;
      let generateError: string | null = null;

      try {
        const reqConfig = {
          model: "gemini-3.6-flash",
          contents: [{ role: "user", parts }],
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "Engaging lecture title" },
                subject: { type: Type.STRING, description: "Detected subject e.g. Physics, Mathematics, Chemistry" },
                topic: { type: Type.STRING, description: "Detected specific chapter/topic" },
                targetLevel: { type: Type.STRING },
                summary: { type: Type.STRING, description: "Short 2-sentence summary of the core concept" },
                thingsToRemember: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "3-4 bullet points of Guru Mantra / Exam takeaways"
                },
                steps: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      title: { type: Type.STRING },
                      speech: { type: Type.STRING, description: "Natural emotional Hinglish speech to be spoken by AI voice" },
                      explanationFocus: {
                        type: Type.STRING,
                        enum: ["writing", "intuition_pause", "diagram_sketch"],
                      },
                      pauseAfterMs: { type: Type.NUMBER },
                      keyTakeaway: { type: Type.STRING },
                      visuals: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            type: { 
                              type: Type.STRING, 
                              enum: ["clear", "text", "latex", "line", "arrow", "circle", "sketch", "highlight"] 
                            },
                            x: { type: Type.NUMBER },
                            y: { type: Type.NUMBER },
                            x1: { type: Type.NUMBER },
                            y1: { type: Type.NUMBER },
                            x2: { type: Type.NUMBER },
                            y2: { type: Type.NUMBER },
                            width: { type: Type.NUMBER },
                            height: { type: Type.NUMBER },
                            radius: { type: Type.NUMBER },
                            content: { type: Type.STRING },
                            color: { type: Type.STRING },
                            size: { type: Type.NUMBER },
                            dashed: { type: Type.BOOLEAN },
                            sketch: {
                              type: Type.OBJECT,
                              properties: {
                                diagramType: { 
                                  type: Type.STRING, 
                                  enum: ["axes", "triangle", "parabola", "circle_radius", "incline_plane", "circuit", "vector", "pendulum", "sine_wave"] 
                                },
                                label: { type: Type.STRING },
                                x: { type: Type.NUMBER },
                                y: { type: Type.NUMBER },
                                width: { type: Type.NUMBER },
                                height: { type: Type.NUMBER },
                                angle: { type: Type.NUMBER },
                                color: { type: Type.STRING }
                              }
                            }
                          },
                          required: ["type"]
                        }
                      }
                    },
                    required: ["id", "title", "speech", "visuals"]
                  }
                }
              },
              required: ["title", "subject", "topic", "summary", "thingsToRemember", "steps"]
            }
          }
        };

        // Retry mechanism for 503 / 429
        let response = null;
        let lastErr = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            if (attempt === 3) reqConfig.model = "gemini-3.6-flash"; // fallback to 3.6 on last attempt
            response = await ai.models.generateContent(reqConfig as any);
            break; // Success!
          } catch (err: any) {
            lastErr = err;
            const msg = err.message || "";
            if (msg.includes("503") || msg.includes("429") || msg.includes("UNAVAILABLE") || msg.includes("RESOURCE_EXHAUSTED")) {
              console.warn(`API attempt ${attempt} failed with high demand/quota error. Retrying...`);
              await new Promise(r => setTimeout(r, 3000 * attempt));
            } else {
              throw err; // Re-throw other errors (e.g. 400 Bad Request)
            }
          }
        }
        if (!response) {
          throw lastErr;
        }

        const responseText = response.text;
        if (responseText) {
          let cleanedJson = responseText.trim();
          if (cleanedJson.startsWith("```json")) {
            cleanedJson = cleanedJson.replace(/^```json/, "").replace(/```$/, "").trim();
          } else if (cleanedJson.startsWith("```")) {
            cleanedJson = cleanedJson.replace(/^```/, "").replace(/```$/, "").trim();
          }
          parsedData = JSON.parse(cleanedJson);
        }
      } catch (genErr: any) {
        console.warn("Primary AI generation error:", genErr.message);
        generateError = genErr.message;
      }

      if (!parsedData || !parsedData.steps || parsedData.steps.length === 0) {
        if (generateError) {
           return res.status(503).json({ success: false, error: "The AI model is experiencing high demand or could not process your problem. Please try again shortly. Detail: " + generateError });
        }
        return res.status(400).json({ success: false, error: "The AI model failed to generate a valid lecture structure. Please try a different prompt or image." });
      }

      const fullLecture = {
        id: "lec-" + Date.now(),
        ...parsedData,
        originalQuestion: problemText || "Uploaded Document / Problem",
        createdAt: Date.now(),
      };

      return res.json({ success: true, lecture: fullLecture });
    } catch (error: any) {
      console.error("Error generating lecture:", error);
      return res.status(500).json({ error: error.message || "Failed to generate AI lecture." });
    }
  });

  // --- 2. TOP AI VOICE SYNTHESIS ENDPOINT (Human-Grade Neural Engine) ---
  app.post("/api/tts", async (req, res) => {
    try {
      const { text, voice = "hi-IN-MadhurNeural", rate = 1.0, pitch = 1.0 } = req.body;

      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: "Text is required for TTS." });
      }

      // Map incoming voices or provide intelligent defaults
      let selectedVoice = voice;
      if (voice === "gemini_kore" || voice === "Kore") {
        selectedVoice = "hi-IN-MadhurNeural";
      } else if (voice === "Puck" || voice === "Prabhat") {
        selectedVoice = "en-IN-PrabhatNeural";
      } else if (voice === "Swara") {
        selectedVoice = "hi-IN-SwaraNeural";
      } else if (voice === "Neerja") {
        selectedVoice = "en-IN-NeerjaExpressiveNeural";
      }

      // 1. PRIMARY ENGINE: High-Fidelity Edge Neural AI Voice (Human-like prosody, Kota mentor style)
      try {
        const ratePercent = Math.round((rate - 1.0) * 100);
        const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;
        const pitchHz = Math.round((pitch - 1.0) * 20);
        const pitchStr = pitchHz >= 0 ? `+${pitchHz}Hz` : `${pitchHz}Hz`;

        const communicate = new Communicate(text, {
          voice: selectedVoice,
          rate: rateStr,
          pitch: pitchStr,
        });

        const chunks: Buffer[] = [];
        for await (const chunk of communicate.stream()) {
          if (chunk.type === "audio" && chunk.data) {
            chunks.push(chunk.data);
          }
        }

        if (chunks.length > 0) {
          const fullBuffer = Buffer.concat(chunks);
          return res.json({
            success: true,
            audioBase64: fullBuffer.toString("base64"),
            format: "mp3",
            mimeType: "audio/mp3",
            voiceUsed: selectedVoice,
          });
        }
      } catch (edgeErr: any) {
        console.warn("Primary Edge Neural TTS note:", edgeErr.message);
      }

      // 2. SECONDARY ENGINE: Google Cloud / Translate Neural High-Speed Synthesis
      try {
        const isHindi = /[\u0900-\u097F]/.test(text) || selectedVoice.startsWith("hi");
        const lang = isHindi ? "hi" : "en-IN";
        const base64Audio = await googleTTS.getAudioBase64(text, {
          lang,
          slow: rate < 0.9,
          host: "https://translate.google.com",
          timeout: 8000,
        });

        if (base64Audio) {
          return res.json({
            success: true,
            audioBase64: base64Audio,
            format: "mp3",
            mimeType: "audio/mp3",
            voiceUsed: `google-${lang}`,
          });
        }
      } catch (gErr: any) {
        console.warn("Secondary Google TTS note:", gErr.message);
      }

      // 3. Fallback flag if server audio streaming failed
      return res.json({ useWebFallback: true });
    } catch (err: any) {
      console.error("TTS endpoint error:", err);
      return res.json({ useWebFallback: true });
    }
  });

  // --- 3. LIVE DOUBT SOLVING / CHAT ENDPOINT ---
  app.post("/api/ask-doubt", async (req, res) => {
    try {
      const { question, currentStepTitle, currentStepSpeech, lectureTitle } = req.body;

      const ai = getGeminiClient();
      if (!ai) {
        return res.status(500).json({ error: "Gemini API key is not configured." });
      }

      const systemPrompt = `
You are Eduro AI, an encouraging and ultra-clear Indian mentor. A student is asking a doubt during a live blackboard lecture.
Current Lecture: "${lectureTitle || "Physics & Math Problem"}"
Current Step: "${currentStepTitle || "Derivation"}"
Current Context: "${currentStepSpeech || ""}"

Respond directly to the student's doubt in warm, feeling-full Hinglish (2-4 sentences). If relevant, provide a concise chalk formula or note they can see on the board.
Format as JSON:
{
  "speech": "Hinglish explanation with emotion and encouragement",
  "chalkNote": "Short concise formula or note for the blackboard",
  "formula": "LaTeX formula if applicable (double backslashes)"
}
`;

      const reqConfig = {
        model: "gemini-3.6-flash",
        contents: [{ parts: [{ text: question }] }],
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
        }
      };

      let response = null;
      let lastErr = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          if (attempt === 3) reqConfig.model = "gemini-3.6-flash";
          response = await ai.models.generateContent(reqConfig);
          break;
        } catch (err: any) {
          lastErr = err;
          const msg = err.message || "";
          if (msg.includes("503") || msg.includes("429") || msg.includes("UNAVAILABLE") || msg.includes("RESOURCE_EXHAUSTED")) {
            console.warn(`Doubt solver API attempt ${attempt} failed with high demand. Retrying...`);
            await new Promise(r => setTimeout(r, 3000 * attempt));
          } else {
            throw err;
          }
        }
      }

      if (!response) {
        throw lastErr;
      }

      const responseText = response.text;
      const data = JSON.parse(responseText || "{}");
      return res.json({ success: true, data });
    } catch (err: any) {
      console.error("Error answering doubt:", err);
      return res.status(500).json({ error: err.message || "Failed to answer doubt." });
    }
  });

  // --- VITE MIDDLEWARE (Development) & STATIC SERVING (Production) ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Eduro AI Blackboard Server running at http://localhost:${PORT}`);
  });
}

startServer();
