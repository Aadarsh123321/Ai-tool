import { EdgeTTS } from 'node-edge-tts';
import fs from 'fs';

async function test() {
  console.log("Starting Madhur...");
  const tts = new EdgeTTS({ voice: 'hi-IN-MadhurNeural' });
  try {
    await tts.ttsPromise("Namaste", "test2.mp3");
    console.log("Madhur Done");
  } catch (e) {
    console.error("Madhur Error:", e);
  }
}
test();
