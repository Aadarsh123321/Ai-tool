import { EdgeTTS } from 'node-edge-tts';
import fs from 'fs';

async function test() {
  console.log("Starting Swara...");
  const tts = new EdgeTTS({ voice: 'hi-IN-SwaraNeural' });
  try {
    await tts.ttsPromise("Namaste", "test4.mp3");
    console.log("Swara Done");
  } catch (e) {
    console.error("Swara Error:", e);
  }
}
test();
