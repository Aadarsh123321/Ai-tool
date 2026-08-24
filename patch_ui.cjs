const fs = require('fs');
const path = 'src/components/LectureControls.tsx';
let content = fs.readFileSync(path, 'utf-8');

const regex = /\{\/\* Single Premium AI Voice Selector Menu \*\/\}.*?\{\/\* Dynamic Spoken Text Display with Karaoke Highlight \*\/\}/s;
const replacement = `{/* Static Voice Display */}
          <div className="relative">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-xs text-sky-300 shadow-sm cursor-default">
              <Volume2 className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-bold tracking-wide">Swara Ma'am (Perfect Hinglish)</span>
            </div>
          </div>
        </div>

        {/* Dynamic Spoken Text Display with Karaoke Highlight */}`;

content = content.replace(regex, replacement);
fs.writeFileSync(path, content);
