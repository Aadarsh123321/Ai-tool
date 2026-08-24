import { EdgeTTS } from 'node-edge-tts';
import fs from 'fs';

async function test() {
  console.log("Starting...");
  const tts = new EdgeTTS({ voice: 'hi-IN-AartiNeural' });
  try {
    await tts.ttsPromise("Namaste, kaise hain aap? Main Aarti hoon.", "test.mp3");
    console.log("Done");
  } catch (e) {
    console.error("Error:", e);
  }
}
test();
