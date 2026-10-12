with open("src/pages/studios/WebStudioPanel.tsx", "r") as f:
    content = f.read()

import_str = "import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';\n"
content = content.replace("import { motion, AnimatePresence } from 'motion/react';\n", "import { motion, AnimatePresence } from 'motion/react';\n" + import_str)

with open("src/pages/studios/WebStudioPanel.tsx", "w") as f:
    f.write(content)
