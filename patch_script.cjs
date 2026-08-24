const fs = require('fs');

const path = 'src/components/LectureControls.tsx';
let content = fs.readFileSync(path, 'utf-8');

const target = `const VOICE_OPTIONS: { id: VoiceModelId; name: string; tag: string; description: string }[] = [
  {
    id: 'hi-IN-AartiNeural',
    name: 'Aarti Ma\\'am',
    tag: 'Perfect Hinglish',
    description: 'Natural female voice perfect for Hinglish & Hindi',
  },
  {
    id: 'hi-IN-MadhurNeural',
    name: 'Madhur Sir',
    tag: 'Kota Mentor',
    description: 'Deep, encouraging Indian Hinglish guru style',
  },
  {
    id: 'hi-IN-SwaraNeural',
    name: 'Swara Ma\\'am',
    tag: 'Science Guru',
    description: 'Crisp, energetic & intuitive Hindi/Hinglish mentor',
  },
  {
    id: 'en-IN-PrabhatNeural',
    name: 'Prabhat Sir',
    tag: 'Conceptual Coach',
    description: 'Clear, patient Indian English academic tone',
  },
  {
    id: 'en-IN-NeerjaExpressiveNeural',
    name: 'Neerja Ma\\'am',
    tag: 'Storyteller',
    description: 'Expressive Indian English, great for deep concepts',
  }
];`;

const replacement = `const VOICE_OPTIONS: { id: VoiceModelId; name: string; tag: string; description: string }[] = [
  {
    id: 'hi-IN-SwaraNeural',
    name: 'Swara Ma\\'am',
    tag: 'Perfect Hinglish',
    description: 'Natural female voice perfect for Hinglish & Hindi',
  }
];`;

content = content.replace(target, replacement);

fs.writeFileSync(path, content);
console.log("LectureControls.tsx updated!");
