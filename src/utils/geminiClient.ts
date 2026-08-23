export const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ""; // Fallback to provided key if deployed on Vercel without env var

export async function generateLectureFromGemini(params: {
  problemText: string;
  imageBase64?: string;
  mimeType?: string;
}) {
  const systemPrompt = `
You are Eduro, a deeply empathetic Indian AI mentor teaching Class 11/JEE level concepts.
STRICT INSTRUCTIONS:
1. Look at the image. Explain the EXACT question in the image step-by-step.
2. Use comforting 'feeling wali' Hinglish. (e.g. "Dekho beta, yahan hum...")
3. The final step MUST be titled "Things to Remember" giving them key takeaways to memorize.
4. Canvas is 900x450. Format math as LaTeX strings using DOUBLE backslashes (e.g. "\\\\lim").

Output ONLY a valid JSON array:
[
  {
    "speech": "Hinglish sentence to speak.",
    "visuals": [
      {"type": "clear"},
      {"type": "latex", "content": "\\\\int x^2 dx", "x": 100, "y": 100, "color": "#00e676"},
      {"type": "text", "content": "Let's draw this", "x": 100, "y": 180, "size": 26, "color": "#ffffff"},
      {"type": "line", "x1": 50, "y1": 250, "x2": 400, "y2": 250, "color": "#3b82f6", "width": 4}
    ]
  }
]
Create 6-9 detailed steps. Provide extensive explanation on the board.
  `;

  const contents: any[] = [{ role: "user", parts: [{ text: params.problemText || "Explain this concept step-by-step." }] }];
  
  if (params.imageBase64 && params.mimeType) {
    const cleanBase64 = params.imageBase64.includes(',') 
      ? params.imageBase64.split(',')[1] 
      : params.imageBase64;

    contents[0].parts.push({
      inlineData: {
        mimeType: params.mimeType,
        data: cleanBase64
      }
    });
  }

  const modelsToTry = ['gemini-2.5-flash', 'gemini-1.5-flash'];
  let data = null;
  let errorMsg = "Failed to connect to AI.";

  for (const model of modelsToTry) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/\${model}:generateContent?key=\${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: contents
        })
      });

      data = await response.json();
      if (data.error && data.error.code === 503) {
        continue;
      }
      break; 
    } catch (e: any) {
      errorMsg = e.message;
    }
  }

  if (!data || data.error) {
    throw new Error(data?.error?.message || errorMsg);
  }

  let aiOutput = data.candidates[0].content.parts[0].text;
  aiOutput = aiOutput.replace(/```json/g, '').replace(/```/g, '').trim();
  
  const parsedSteps = JSON.parse(aiOutput);
  
  return {
    title: params.problemText.substring(0, 40) || "Generated Lecture",
    steps: parsedSteps
  };
}

export async function askDoubtFromGemini(params: {
  question: string;
  currentStepTitle?: string;
  currentStepSpeech?: string;
  lectureTitle?: string;
}) {
  const systemPrompt = `
You are Eduro AI, an encouraging and ultra-clear Indian mentor. A student is asking a doubt during a live blackboard lecture.
Current Context: "\${params.currentStepSpeech || ""}"

Respond directly to the student's doubt in warm, feeling-full Hinglish (2-4 sentences). If relevant, provide a concise chalk formula or note they can see on the board.
Format as JSON:
{
  "speech": "Hinglish explanation with emotion and encouragement",
  "chalkNote": "Short concise formula or note for the blackboard",
  "formula": "LaTeX formula if applicable (double backslashes)"
}
  `;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=\${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: params.question }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: "application/json"
      }
    })
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);

  const text = data.candidates[0].content.parts[0].text;
  return JSON.parse(text);
}
