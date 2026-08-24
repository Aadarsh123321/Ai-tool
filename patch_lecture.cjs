const fs = require('fs');

const path = 'src/components/LectureControls.tsx';
let content = fs.readFileSync(path, 'utf-8');

const targetDropdown = `{/* Single Premium AI Voice Selector Menu */}
          <div className="relative">
            <button
              id="voice-selector-toggle-btn"
              onClick={() => setIsVoiceDropdownOpen(!isVoiceDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-xs text-sky-300 transition-all cursor-pointer shadow-sm"
              title="Change AI Tutor Voice"
            >
              <Volume2 className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-bold tracking-wide">{currentVoiceObj.name} ({currentVoiceObj.tag})</span>
              <ChevronDown className="w-3 h-3 text-sky-400" />
            </button>
            {isVoiceDropdownOpen && (
              <div 
                id="voice-dropdown-menu"
                className="absolute right-0 top-8 mt-1 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 flex flex-col gap-1 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  Select AI Human Voice Mentor
                </div>
                {VOICE_OPTIONS.map((voice) => {
                  const isSelected = voice.id === voiceSettings.voiceModel;
                  return (
                    <button
                      key={voice.id}
                      onClick={() => {
                        onVoiceSettingsChange({
                          ...voiceSettings,
                          voiceModel: voice.id,
                        });
                        setIsVoiceDropdownOpen(false);
                      }}
                      className={\`text-left px-2.5 py-2 rounded-lg text-xs transition-all flex items-center justify-between \${
                        isSelected
                          ? 'bg-sky-500/20 text-sky-200 border border-sky-500/40 font-bold'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }\`}
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span>{voice.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 bg-slate-800 text-sky-400 rounded-full font-medium">
                            {voice.tag}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-0.5">{voice.description}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-sky-400 shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>`;

const replacementDropdown = `{/* Static Voice Display */}
          <div className="relative">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-xs text-sky-300 shadow-sm cursor-default">
              <Volume2 className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-bold tracking-wide">Swara Ma'am (Perfect Hinglish)</span>
            </div>
          </div>`;

content = content.replace(targetDropdown, replacementDropdown);
fs.writeFileSync(path, content);
console.log("LectureControls UI updated!");
