const fs = require('fs');

let content = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

if (!content.includes('import { useAudio }')) {
  content = content.replace(
    "import { useSystemState } from '../contexts/SystemStateContext';",
    "import { useSystemState } from '../contexts/SystemStateContext';\nimport { useAudio } from '../contexts/AudioContext';"
  );
}

content = content.replace(
  "  const { uiPreferences, isAdmin } = useSystemState();",
  "  const { uiPreferences, isAdmin } = useSystemState();\n  const audio = useAudio();"
);

const hapticLogic = `
  const triggerSimulatedHaptic = (type: 'success' | 'error' | 'scroll') => {
    setSimulatedVibe(type);
    if (type === 'success') {
      if (audio?.playSuccess) audio.playSuccess();
      toast.success('Haptic simulated: Double soft pulse (Success)');
    } else if (type === 'error') {
      if (audio?.playError) audio.playError();
      toast.error('Haptic simulated: Single heavy vibration (Error)');
    } else {
      if (audio?.playActivation) audio.playActivation();
      toast.info('Haptic simulated: Light tick (Scroll feel)');
    }
    setTimeout(() => setSimulatedVibe(null), 500);
  };
`;

content = content.replace(
  /  const triggerSimulatedHaptic = \(type: 'success' \| 'error' \| 'scroll'\) => \{[\s\S]*?setTimeout\(\(\) => setSimulatedVibe\(null\), 500\);\n  \};/,
  hapticLogic.trim()
);

fs.writeFileSync('src/components/AdminPanel.tsx', content);
