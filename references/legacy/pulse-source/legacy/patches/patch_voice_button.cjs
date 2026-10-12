const fs = require('fs');
let file = fs.readFileSync('src/components/VoiceOutputButton.tsx', 'utf8');

if (!file.includes('Load Voices')) {
  file = file.replace(`{voices.length === 0 && <div className="px-1 text-zinc-500">No voices found</div>}`, `{voices.length === 0 && (
            <div className="flex flex-col gap-2">
              <div className="px-1 text-zinc-500 text-[9px]">No voices found</div>
              <button 
                onClick={() => {
                  const availableVoices = window.speechSynthesis.getVoices();
                  if (availableVoices.length > 0) setVoices(availableVoices);
                }}
                className="w-full text-left px-2 py-1 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold"
              >
                Reload Voices
              </button>
            </div>
          )}`);
  fs.writeFileSync('src/components/VoiceOutputButton.tsx', file, 'utf8');
}
