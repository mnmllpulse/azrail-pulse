const fs = require('fs');

let content = fs.readFileSync('src/contexts/SystemStateContext.tsx', 'utf8');

if (!content.includes('import { useAudio }')) {
  content = content.replace(
    "import React, { createContext, useContext, useState, useEffect } from 'react';",
    "import React, { createContext, useContext, useState, useEffect } from 'react';\nimport { useAudio } from './AudioContext';"
  );
}

// In the component:
content = content.replace(
  "export function SystemStateProvider({ children }: { children: React.ReactNode }) {",
  "export function SystemStateProvider({ children }: { children: React.ReactNode }) {\n  const audio = useAudio();"
);

// We want to call audio.setDroneLoad(logicCoreLoad) when logicCoreLoad changes.
content = content.replace(
  "  const [logicCoreLoad, setLogicCoreLoadState] = useState(42.5);",
  "  const [logicCoreLoad, setLogicCoreLoadState] = useState(42.5);\n\n  useEffect(() => {\n    if (audio && audio.setDroneLoad) {\n      audio.setDroneLoad(logicCoreLoad);\n    }\n  }, [logicCoreLoad, audio]);"
);

fs.writeFileSync('src/contexts/SystemStateContext.tsx', content);
