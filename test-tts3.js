import { EdgeTTS } from 'edge-tts-universal';
import fs from 'fs';

async function test() {
  console.log("Starting universal Aarti...");
  try {
    const tts = new EdgeTTS();
    await tts.save("test3.mp3", "Namaste", { voice: 'hi-IN-AartiNeural' });
    console.log("Universal Done");
  } catch (e) {
    console.error("Universal Error:", e);
  }
}
test();
