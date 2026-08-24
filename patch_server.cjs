const fs = require('fs');

const path = 'server.ts';
let content = fs.readFileSync(path, 'utf-8');

const target = `    // Microsoft Edge Free TTS only supports Swara and Madhur for Hindi. 
    // Aarti is an Azure-only voice that causes a 15-second timeout on the free tier.
    // We map it to Swara to ensure fast, working Hinglish female speech!
    const selectedVoice = voice || 'hi-IN-AartiNeural';
    const safeVoice = selectedVoice === 'hi-IN-AartiNeural' ? 'hi-IN-SwaraNeural' : selectedVoice;
    
    const tts = new EdgeTTS({ voice: safeVoice });`;

const replacement = `    // Hardcoded to SwaraNeural as requested permanently
    const safeVoice = 'hi-IN-SwaraNeural';
    
    const tts = new EdgeTTS({ voice: safeVoice });`;

content = content.replace(target, replacement);
fs.writeFileSync(path, content);
console.log("server.ts updated!");
