import { EdgeTTS } from 'node-edge-tts';
async function test() {
  const tts = new EdgeTTS();
  const voices = await tts.getVoices();
  const hi = voices.filter(v => v.Locale.includes('hi-IN'));
  console.log(hi.map(v => v.Name));
}
test();
