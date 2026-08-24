const fs = require('fs');

const path = 'src/types.ts';
let content = fs.readFileSync(path, 'utf-8');

const target = `export type VoiceModelId = 
  | 'hi-IN-MadhurNeural'
  | 'hi-IN-SwaraNeural'
  | 'hi-IN-AartiNeural'
  | 'en-IN-PrabhatNeural'
  | 'en-IN-NeerjaExpressiveNeural'
  | 'gemini_kore';`;

const replacement = `export type VoiceModelId = 'hi-IN-SwaraNeural';`;

content = content.replace(target, replacement);
fs.writeFileSync(path, content);
console.log("types.ts updated!");
