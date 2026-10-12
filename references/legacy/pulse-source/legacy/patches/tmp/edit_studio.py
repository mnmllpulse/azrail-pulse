import os

path = 'src/pages/studios/WebStudioPanel.tsx'
content = open(path).read()

# 1. We will insert the tab button for Suite 2026 after the Playground tab button.
# Let's search for the exact Playground tab button.
target_tab = """                    <button 
                       onClick={() => {
                         setViewMode('playground');
                         addTerminalLog('Opened Interactive Component Playground.');
                       }}
                       className={`px-2 py-1 text-[9px] font-mono rounded-md transition-colors uppercase ${viewMode === 'playground' ? (isLight ? 'bg-white text-gray-900 shadow-sm' : 'bg-white/10 text-white') : 'hover:text-white'}`}
                    >
                      Playground
                    </button>"""

replacement_tab = """                    <button 
                       onClick={() => {
                         setViewMode('playground');
                         addTerminalLog('Opened Interactive Component Playground.');
                       }}
                       className={`px-2 py-1 text-[9px] font-mono rounded-md transition-colors uppercase ${viewMode === 'playground' ? (isLight ? 'bg-white text-gray-900 shadow-sm' : 'bg-white/10 text-white') : 'hover:text-white'}`}
                    >
                      Playground
                    </button>
                    <button 
                       onClick={() => {
                         setViewMode('suite2026');
                         playBeep(900, 0.05);
                         addTerminalLog('Opened Elite 2026 Advanced Tools & Functions Control Center.');
                       }}
                       className={`px-2 py-1 text-[9px] font-mono rounded-md transition-colors uppercase hover:text-white ${viewMode === 'suite2026' ? (isLight ? 'bg-white text-gray-900 shadow-sm' : 'bg-white/10 text-white') : ''}`}
                    >
                      Suite 2026
                    </button>"""

if target_tab in content:
    content = content.replace(target_tab, replacement_tab)
else:
    # If indentation is slightly different, let's normalize indentation and find it
    print("Warning: Exact tab match not found, running flexible replace for tab button.")
    # Let's locate 'Playground' button and insert right after its closing button tag
    idx = content.find("setViewMode('playground')")
    if idx != -1:
        closing_btn_idx = content.find("</button>", idx)
        if closing_btn_idx != -1:
            insert_pos = closing_btn_idx + len("</button>")
            suite_tab_code = """\n                    <button 
                       onClick={() => {
                         setViewMode('suite2026');
                         playBeep(900, 0.05);
                         addTerminalLog('Opened Elite 2026 Advanced Tools & Functions Control Center.');
                       }}
                       className={`px-2 py-1 text-[9px] font-mono rounded-md transition-colors uppercase hover:text-white ${viewMode === 'suite2026' ? (isLight ? 'bg-white text-gray-900 shadow-sm' : 'bg-white/10 text-white') : ''}`}
                    >
                      Suite 2026
                    </button>"""
            content = content[:insert_pos] + suite_tab_code + content[insert_pos:]
            print("Flexible tab replace completed.")


# 2. Add the dynamic grid overlay on top of the iframe in preview mode if f31 is active.
iframe_str = """                        <iframe
                          title="Sandbox Site Output"
                          srcDoc={getIframeSource()}
                          className="w-full h-full border-0"
                          sandbox="allow-scripts"
                        />"""

iframe_replacement = """                        <iframe
                          title="Sandbox Site Output"
                          srcDoc={getIframeSource()}
                          className="w-full h-full border-0"
                          sandbox="allow-scripts"
                        />
                        {suiteFunctions.f31 && (
                          <div className="absolute inset-0 pointer-events-none z-20 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:16px_16px] opacity-15" />
                        )}"""

content = content.replace(iframe_str, iframe_replacement)


# 3. Add the conditional rendering of viewMode === 'suite2026' right before viewMode === 'playground'
target_render = """               {viewMode === 'playground' ? ("""

replacement_render = """               {viewMode === 'suite2026' ? (
                 <motion.div 
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="flex-1 flex flex-col min-h-0"
                 >
                   {renderSuite2026()}
                 </motion.div>
               ) : {viewMode === 'playground' ? ("""

if target_render in content:
    content = content.replace(target_render, replacement_render)
else:
    print("Warning: Target render pattern not matched exactly. Trying flexible match.")
    idx_render = content.find("viewMode === 'playground' ? (")
    if idx_render != -1:
        # Find the indentation before viewMode === 'playground'
        start_line_pos = content.rfind("\n", 0, idx_render) + 1
        indentation = content[start_line_pos:idx_render]
        replacement_flexible = f"""{{viewMode === 'suite2026' ? (
                 <motion.div 
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="flex-1 flex flex-col min-h-0"
                 >
                   {{renderSuite2026()}}
                 </motion.div>
               ) : {{viewMode === 'playground' ? ("""
        content = content[:idx_render] + replacement_flexible + content[idx_render + len("viewMode === 'playground' ? ("):]
        print("Flexible render replace completed.")


# 4. Insert the Canvas animation and Multi-Agent simulation useEffect hooks and renderSuite2026 helper.
hooks_and_helpers = """
  // useEffect hook to animate the custom 2026 Shader canvas
  useEffect(() => {
    if (viewMode !== 'suite2026' || activeSuiteTool !== 'shader') return;
    const canvas = document.getElementById('suite-shader-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animationFrameId;
    let tick = 0;

    const render = () => {
      tick += (shaderSpeed * 0.02);
      const width = canvas.width = canvas.offsetWidth || 300;
      const height = canvas.height = canvas.offsetHeight || 180;
      ctx.clearRect(0, 0, width, height);

      if (shaderType === 'plasma') {
        // Draw fluid plasma waves
        for (let y = 0; y < height; y += 4) {
          for (let x = 0; x < width; x += 4) {
            const val1 = Math.sin(x / shaderScale + tick);
            const val2 = Math.sin(y / shaderScale + tick * 1.5);
            const val3 = Math.sin((x + y) / shaderScale + tick);
            const total = (val1 + val2 + val3) / 3;
            
            const r = Math.floor((Math.sin(total * Math.PI) * 0.5 + 0.5) * 255);
            const g = Math.floor((Math.sin(total * Math.PI + shaderColorShift / 10) * 0.5 + 0.5) * 150);
            const b = Math.floor((Math.cos(total * Math.PI) * 0.5 + 0.5) * 255);
            
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(x, y, 4, 4);
          }
        }
      } else if (shaderType === 'nebula') {
        // Cosmic nebula particle clouds
        const grad = ctx.createRadialGradient(width/2, height/2, 10, width/2, height/2, width/2);
        const c1 = `hsla(${shaderColorShift + tick * 10}, 80%, 50%, 0.6)`;
        const c2 = `hsla(${shaderColorShift + 120 + tick * 5}, 70%, 20%, 0.2)`;
        grad.addColorStop(0, c1);
        grad.addColorStop(0.5, c2);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      } else {
        // Cyber Mesh Grid
        ctx.strokeStyle = `rgba(129, 140, 248, 0.25)`;
        ctx.lineWidth = 1;
        const spacing = shaderScale + 5;
        for (let x = 0; x < width; x += spacing) {
          ctx.beginPath();
          for (let y = 0; y < height; y += 10) {
            const offset = Math.sin(y * 0.05 + tick) * 10;
            if (y === 0) ctx.moveTo(x + offset, y);
            else ctx.lineTo(x + offset, y);
          }
          ctx.stroke();
        }
      }
      animationFrameId = requestAnimationFrame(render);
    };
    render();
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [viewMode, activeSuiteTool, shaderSpeed, shaderColorShift, shaderScale, shaderType]);

  // useEffect hook to simulate Multi-Agent Swarm conversations
  useEffect(() => {
    if (!swarmActive) return;
    
    const messages = [
      { agent: 'AI Product Manager', color: 'text-indigo-400', msg_en: 'Release requirements defined. Target: WCAG accessibility 100% and dynamic 2026 aesthetics.', msg_ru: 'Требования к релизу определены. Цель: доступность WCAG 100% и динамическая эстетика 2026.' },
      { agent: 'AI UX Architect', color: 'text-fuchsia-400', msg_en: 'Crafted fluid layout tokens with organic glassmorphism variables.', msg_ru: 'Созданы адаптивные токены разметки с органическими переменными стеклянного стиля.' },
      { agent: 'AI Senior Engineer', color: 'text-cyan-400', msg_en: 'Assembled react nodes bundle and optimized CSS tree-shaking.', msg_ru: 'Собрана связка React-нод и оптимизировано дерево стилей CSS.' },
      { agent: 'AI QA Specialist', color: 'text-emerald-400', msg_en: 'DOM audit completed successfully. Verified zero broken links.', msg_ru: 'Аудит дерева DOM успешно пройден. Проверено отсутствие битых ссылок.' },
      { agent: 'AI Core Router', color: 'text-yellow-400', msg_en: 'Synchronized production build with active custom Cloudflare Pages Edge DNS.', msg_ru: 'Производственная сборка синхронизирована с активным граничным DNS Cloudflare.' }
    ];

    let count = 0;
    const interval = setInterval(() => {
      const msg = messages[count % messages.length];
      const timestamp = new Date().toTimeString().split(' ')[0];
      setSwarmLogs(prev => [
        ...prev,
        { time: timestamp, agent: msg.agent, color: msg.color, message: targetLanguage === 'en' ? msg.msg_en : msg.msg_ru }
      ]);
      playBeep(600 + (count % 3) * 100, 0.05);
      count++;
    }, 4000);

    return () => clearInterval(interval);
  }, [swarmActive, targetLanguage]);

  const handleApplyNeuroLayout = (preset: string) => {
    playBeep(880, 0.1);
    addTerminalLog(`Initiating Neuro-Layout construction for style preset: [${preset}]`);
    
    let simulatedCode = "";
    let simulatedTitle = "";
    
    if (preset === 'cyberpunk') {
      simulatedTitle = "Quantum Cyber Matrix Landing";
      simulatedCode = `<div class="min-h-screen bg-[#050508] text-white p-8 font-mono flex flex-col justify-between relative overflow-hidden">
  <!-- Glowing grids -->
  <div class="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
  
  <header class="flex justify-between items-center border-b border-purple-500/30 pb-4 relative z-10">
    <div class="flex items-center gap-2">
      <span class="w-3 h-3 rounded-full bg-purple-500 animate-pulse shadow-[0_0_10px_#d946ef]"></span>
      <span class="text-xs font-bold tracking-widest text-purple-400">MATRIX.OS v2.06</span>
    </div>
    <span class="text-[10px] text-zinc-500">SECURE SHELL PROTOCOL</span>
  </header>

  <main class="my-16 text-center relative z-10 max-w-2xl mx-auto">
    <div class="inline-block px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] rounded-full uppercase tracking-[0.2em] mb-6">AI-Generated Layout</div>
    <h1 class="text-4xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-indigo-400 mb-6 uppercase">
      The Next Paradigm of Autonomous Code
    </h1>
    <p class="text-xs text-zinc-400 leading-relaxed max-w-md mx-auto mb-8">
      Explore decentralized node architectures compiling direct edge functions securely, powered by reactive client arrays.
    </p>
    <div class="flex items-center justify-center gap-4">
      <button class="bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold py-2 px-6 rounded-lg shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all">Connect System</button>
      <button class="border border-zinc-700 hover:border-zinc-500 text-zinc-300 text-xs py-2 px-6 rounded-lg transition-all">Docs</button>
    </div>
  </main>

  <footer class="border-t border-zinc-800 pt-4 flex justify-between text-[9px] text-zinc-500 relative z-10">
    <span>SYSTEM LOCK STATUS: STABLE</span>
    <span>COMPILING SUCCESSFUL</span>
  </footer>
</div>`;
    } else if (preset === 'minimal') {
      simulatedTitle = "Modernist Swiss Architecture";
      simulatedCode = `<div class="min-h-screen bg-[#f9f9f9] text-[#111111] p-12 font-sans flex flex-col justify-between">
  <header class="flex justify-between items-baseline border-b border-black pb-4">
    <span class="font-bold text-sm uppercase tracking-wider">Studio Grid</span>
    <span class="text-xs">Issue 04 / 2026</span>
  </header>

  <main class="my-20 max-w-xl">
    <span class="text-xs font-mono uppercase tracking-widest text-zinc-400 block mb-4">Precision Aesthetics</span>
    <h1 class="text-5xl font-light tracking-tight text-zinc-900 leading-[1.1] mb-8">
      Form follows function. Precision rules speed.
    </h1>
    <p class="text-sm text-zinc-600 leading-relaxed mb-10">
      A pristine layout centering deep typographic visual rhythms, designed strictly using standard content coordinates and high-contrast negative space.
    </p>
    <button class="bg-black text-white hover:bg-zinc-800 text-xs font-bold py-3 px-8 transition-colors">
      Enter Exhibition
    </button>
  </main>

  <footer class="flex justify-between text-xs text-zinc-400 border-t border-zinc-200 pt-6">
    <span>Zürich, CH</span>
    <span>© 2026 Studio Grid. All rights reserved.</span>
  </footer>
</div>`;
    } else {
      simulatedTitle = "Organic Nebula Aurora Grid";
      simulatedCode = `<div class="min-h-screen bg-slate-950 text-slate-100 p-8 flex flex-col justify-between relative overflow-hidden">
  <!-- Glowing backdrops -->
  <div class="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>
  <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-500/10 rounded-full blur-[100px] pointer-events-none"></div>

  <header class="flex justify-between items-center border-b border-slate-800 pb-4 relative z-10">
    <span class="font-bold tracking-widest text-emerald-400 font-mono text-xs">AURA.NET</span>
    <span class="text-[10px] text-slate-500 font-mono">LATENCY: 4ms</span>
  </header>

  <main class="my-20 max-w-2xl mx-auto text-center relative z-10">
    <div class="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] rounded-full uppercase font-mono mb-6">
      <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
      Ambient Nodes Online
    </div>
    <h1 class="text-4xl sm:text-5xl font-semibold tracking-tight text-slate-100 mb-6">
      Experience Fluid Organic Digital Canvas
    </h1>
    <p class="text-sm text-slate-400 leading-relaxed max-w-md mx-auto mb-10">
      Harmonizing fluid neon mesh backdrops with structural grid content boxes for eye-safe professional presentation.
    </p>
    <button class="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold py-2.5 px-8 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all">
      Deploy Ambient Node
    </button>
  </main>

  <footer class="flex justify-between text-[10px] text-slate-500 font-mono relative z-10">
    <span>SECURE CONNECTION SHIELD ACTIVE</span>
    <span>EDGE PROPAGATED</span>
  </footer>
</div>`;
    }

    const updatedResult = {
      title: simulatedTitle,
      codeSnippet: simulatedCode,
      metadata: {
        framework: 'React 19 / HTML5',
        styling: 'Tailwind CSS',
        theme: preset.toUpperCase(),
        estimatedRenderTime: '0.12s',
        structure: ['Header V3', 'Hero Core Main', 'Action Container', 'Footer Block']
      }
    };

    setResult(updatedResult);
    setPageCodes(prev => ({
      ...prev,
      [activePage]: updatedResult
    }));
    addTerminalLog(`Successfully injected dynamic [${preset.toUpperCase()}] layout into the active preview frame!`);
  };

  const handleApplyShaderToBackground = () => {
    if (!result) {
      addTerminalLog('Shader injection failed: compile or select a layout first.');
      return;
    }
    playBeep(980, 0.08);
    addTerminalLog('Injecting animated custom Shader variables to CSS styling tree...');
    
    // Let's inject a beautiful animated CSS keyframe background styles into the current preview code
    const shaderStyleCode = `
  <!-- INJECTED 2026 WEBGL SHADER STYLING EFFECTS -->
  <style>
    @keyframes plasmaFlow {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    .shader-bg-inject {
      background: linear-gradient(-45deg, #0f172a, #1e1b4b, #311042, #111827);
      background-size: 400% 400% !important;
      animation: plasmaFlow ${15 - shaderSpeed}s ease infinite !important;
    }
  </style>
`;
    let code = result.codeSnippet;
    
    // Insert after body tag or top container if present
    if (code.includes('<body>')) {
      code = code.replace('<body>', `<body>\\n  ${shaderStyleCode}`);
    } else {
      const topDivIndex = code.indexOf('<div');
      if (topDivIndex !== -1) {
        // Insert style tag and add CSS class to outer div
        const classIndex = code.indexOf('class="', topDivIndex);
        if (classIndex !== -1 && classIndex < topDivIndex + 100) {
          code = code.substring(0, classIndex + 7) + 'shader-bg-inject ' + code.substring(classIndex + 7);
        }
        code = shaderStyleCode + code;
      } else {
        code = shaderStyleCode + code;
      }
    }

    setResult({
      ...result,
      codeSnippet: code
    });
    addTerminalLog('Successfully applied animated fluid shader background to preview frame!');
  };

  const handleSyncFigmaFrame = () => {
    setFigmaSyncStatus('fetching');
    playBeep(700, 0.1);
    addTerminalLog(`Connecting to Figma Cloud API frame endpoint [${figmaFrameName}]...`);
    
    setTimeout(() => {
      setFigmaSyncStatus('success');
      playBeep(1100, 0.08);
      setFigmaTokens({
        frameName: figmaFrameName,
        synchronizedAt: '2026-07-15 14:15',
        status: 'SUCCESS',
        tokens: {
          primaryColor: '#6366f1',
          secondaryColor: '#10b981',
          borderRadius: '16px',
          typography: 'Space Grotesk',
          paddingScale: 'compact-24px',
          neonShadow: '0 0 15px rgba(99,102,241,0.35)'
        }
      });
      addTerminalLog(`Figma frame [${figmaFrameName}] synchronized! Extracted 6 core design tokens.`);
    }, 2000);
  };

  const handleApplyFigmaTokens = () => {
    if (!result || !figmaTokens) return;
    playBeep(850, 0.08);
    addTerminalLog('Applying Figma design tokens to layout CSS classes...');
    
    let code = result.codeSnippet;
    // Replace standard indigo colors with Figma extracted colors, or customize buttons
    code = code.replace(/purple-600/g, 'indigo-600');
    code = code.replace(/purple-500/g, 'indigo-500');
    
    setResult({
      ...result,
      codeSnippet: code
    });
    addTerminalLog('Figma variables merged! Sandbox layout updated.');
  };

  const handleRunQAFixes = () => {
    playBeep(1000, 0.15, 'triangle');
    addTerminalLog('Running autonomous accessibility WCAG tree audits...');
    
    let simulatedCode = result ? result.codeSnippet : "";
    if (simulatedCode) {
      // Replace low contrast with high contrast
      simulatedCode = simulatedCode.replace(/text-zinc-500/g, 'text-zinc-300 font-semibold');
      simulatedCode = simulatedCode.replace(/text-zinc-400/g, 'text-zinc-200');
      // Inject accessibility attributes
      simulatedCode = simulatedCode.replace(/<button/g, '<button aria-label="Interactive Action Trigger"');
      simulatedCode = simulatedCode.replace(/<img/g, '<img alt="Semantic layouts graphic illustration"');
    }

    setQaFixed(true);
    setQaScore(100);
    
    if (result) {
      setResult({
        ...result,
        codeSnippet: simulatedCode
      });
    }
    
    addTerminalLog('Accessibility tree repaired! Score boosted to 100/100. WCAG Shield Issued.');
  };

  const renderSuite2026 = () => {
    const isLight_ = isLight;
    return (
      <div className={`flex-1 rounded-xl border p-4 sm:p-5 mb-4 overflow-y-auto flex flex-col gap-6 ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-[#050505] border-white/5'}`}>
        {/* Module Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4 shrink-0">
          <div>
            <h4 className="text-xs font-bold text-indigo-400 font-mono uppercase tracking-[0.2em] flex items-center gap-2">
              <Sparkles className="w-4 h-4 animate-pulse text-indigo-400" /> Web Studio 2026 Advanced Suite
            </h4>
            <p className="text-[10px] text-zinc-400 font-mono mt-1">
              {t('EXPLORATIVE NEURAL PIPELINE PACK INTEGRATING THE TOP 5 TOOLS & 20 TECHNOLOGICAL FUNCTIONS OF 2026.', 'ЭКСПЕРИМЕНТАЛЬНЫЙ ПАКЕТ ИНСТРУМЕНТОВ И 20 ТЕХНОЛОГИЧЕСКИХ ФУНКЦИЙ НА 2026 ГОД.')}
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono text-[9px] bg-black/40 px-2.5 py-1 rounded-lg border border-white/5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-zinc-400">STATUS:</span>
            <span className="text-emerald-400 font-bold">CORE RUNTIME ONLINE</span>
          </div>
        </div>

        {/* SECTION 1: THE 5 ADVANCED TOOLS DOCK & INTERACTIVE SIMULATORS */}
        <div className="space-y-3">
          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>I. 5 Top-Tier Technological Tools of 2026 / Пять передовых инструментов</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Left side: Tool Selection Dock (5 columns) */}
            <div className="md:col-span-5 flex flex-col gap-2 border-r border-white/5 pr-4">
              {[
                { id: 'neuro', label: t('AI Neuro-Layout Architect', 'Нейро-архитектор макетов'), desc: t('Generate fully responsive semantic layouts in one click.', 'Генерация семантических макетов по описанию.') },
                { id: 'shader', label: t('WebGL Shader Background Designer', 'Дизайнер WebGL Шейдеров'), desc: t('Compile live fluid gradient patterns on GPU Canvas.', 'Создание плавных градиентов на HTML5 Canvas.') },
                { id: 'figma', label: t('Figma AI Component Translator', 'Figma AI-транслятор'), desc: t('Sync frames and design variables from Figma frames.', 'Импорт дизайн-токенов из ссылок Figma.') },
                { id: 'qa', label: t('Autonomous QA Accessibility Agent', 'QA-агент доступности'), desc: t('WCAG 2.1 compliance checker and auto-repair helper.', 'Проверка и авто-исправление стандартов WCAG.') },
                { id: 'swarm', label: t('Multi-Agent Developer Swarm', 'Мульти-агентный рой'), desc: t('Stream logs from specialized collaborative developers.', 'Синхронная работа команды автономных ИИ-агентов.') }
              ].map(tool => (
                <button
                  key={tool.id}
                  onClick={() => {
                    setActiveSuiteTool(tool.id as any);
                    playBeep(800, 0.05);
                    addTerminalLog(`Switched Suite 2026 workspace view to: ${tool.label}`);
                  }}
                  className={`flex flex-col text-left p-2.5 rounded-xl border transition-all ${
                    activeSuiteTool === tool.id
                      ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.05)]'
                      : 'bg-white/5 border-transparent hover:bg-white/10 text-zinc-400'
                  }`}
                >
                  <div className="text-xs font-semibold leading-none mb-1 flex items-center justify-between">
                    <span>{tool.label}</span>
                    {activeSuiteTool === tool.id && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                  </div>
                  <p className="text-[9px] opacity-60 leading-relaxed truncate">{tool.desc}</p>
                </button>
              ))}
            </div>

            {/* Right side: Active Tool Interactive Simulator (7 columns) */}
            <div className="md:col-span-7 bg-black/40 border border-white/5 rounded-2xl p-4 flex flex-col gap-4 min-h-[220px]">
              
              {/* Neuro-Layout Tool */}
              {activeSuiteTool === 'neuro' && (
                <div className="flex-1 flex flex-col justify-between gap-3">
                  <div className="space-y-1.5">
                    <h5 className="text-[11px] font-bold text-white font-mono uppercase tracking-wider">{t('AI Neuro-Layout Architect', 'Нейро-архитектор макетов')}</h5>
                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                      {t('Input a creative design prompt and compile a fully operational high-fidelity web page layout direct inside the interactive sandbox preview.', 'Введите текстовый запрос для генерации полноценного адаптивного макета, оптимизированного по всем канонам верстки.')}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-3 gap-1.5">
                      {['cyberpunk', 'minimal', 'organic'].map(style => (
                        <button
                          key={style}
                          onClick={() => handleApplyNeuroLayout(style)}
                          className="py-1.5 rounded-lg border border-white/10 hover:border-indigo-500/30 bg-white/5 hover:bg-indigo-600/5 text-[9px] font-mono text-white font-bold uppercase transition-all"
                        >
                          {style === 'cyberpunk' ? 'Cyberpunk' : style === 'minimal' ? 'Swiss Minimal' : 'Aurora Fluid'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* WebGL Shader Designer */}
              {activeSuiteTool === 'shader' && (
                <div className="flex-1 flex flex-col justify-between gap-3">
                  <div className="space-y-1.5">
                    <h5 className="text-[11px] font-bold text-white font-mono uppercase tracking-wider flex items-center justify-between">
                      <span>{t('WebGL Shader Canvas Simulator', 'Симулятор WebGL Шейдеров')}</span>
                      <span className="text-[8px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded uppercase font-mono tracking-wider">GPU Render</span>
                    </h5>
                    
                    {/* Live Canvas Wave Rendering! */}
                    <div className="w-full h-24 bg-[#09090b] rounded-xl border border-white/5 overflow-hidden relative">
                      <canvas id="suite-shader-canvas" className="w-full h-full block" />
                      <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/70 px-1.5 py-0.5 rounded font-mono text-[8px] text-indigo-400 uppercase">
                        <Activity className="w-2.5 h-2.5 animate-pulse" /> Live GPU Wave
                      </div>
                    </div>

                    {/* Parameters Matrix */}
                    <div className="grid grid-cols-2 gap-3 mt-2 text-[9px] font-mono">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-zinc-400">
                          <span>SPEED:</span>
                          <span className="text-white font-bold">{shaderSpeed}x</span>
                        </div>
                        <input
                          type="range" min="1" max="10" value={shaderSpeed}
                          onChange={e => setShaderSpeed(Number(e.target.value))}
                          className="w-full accent-indigo-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-zinc-400">
                          <span>SCALE / FOCUS:</span>
                          <span className="text-white font-bold">{shaderScale}px</span>
                        </div>
                        <input
                          type="range" min="5" max="50" value={shaderScale}
                          onChange={e => setShaderScale(Number(e.target.value))}
                          className="w-full accent-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[9px] font-mono mt-1">
                      <span className="text-zinc-400">SHADER MODE:</span>
                      <div className="flex gap-1.5">
                        {['plasma', 'nebula', 'grid'].map(m => (
                          <button
                            key={m}
                            onClick={() => setShaderType(m as any)}
                            className={`px-2 py-0.5 rounded border uppercase text-[8px] ${
                              shaderType === m ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300' : 'bg-transparent border-white/5 text-zinc-400'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleApplyShaderToBackground}
                    className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5"
                  >
                    <Sliders className="w-3.5 h-3.5" /> Apply Animated Shader to Preview
                  </button>
                </div>
              )}

              {/* Figma AI Translation Tool */}
              {activeSuiteTool === 'figma' && (
                <div className="flex-1 flex flex-col justify-between gap-3">
                  <div className="space-y-1.5">
                    <h5 className="text-[11px] font-bold text-white font-mono uppercase tracking-wider">{t('Figma Frame Translator', 'Импорт токенов Figma')}</h5>
                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                      {t('Connect absolute cloud links to extract precise layout tokens, rounding, and coloring spectrum into native Tailwind styles.', 'Подключите облачную ссылку Figma, чтобы извлечь точные параметры скруглений, сетки и цветовых палитр в классы Tailwind.')}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={figmaFrameName}
                      onChange={e => setFigmaFrameName(e.target.value)}
                      placeholder="figma.com/file/abcdef.../Desktop-Dashboard"
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg py-1 px-2.5 text-[10px] text-white outline-none font-mono focus:border-indigo-500/50"
                    />
                    <button
                      onClick={handleSyncFigmaFrame}
                      disabled={figmaSyncStatus === 'fetching'}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-[9px] font-bold px-3 py-1 rounded-lg uppercase shrink-0 transition-colors"
                    >
                      {figmaSyncStatus === 'fetching' ? 'Syncing...' : 'Sync Figma'}
                    </button>
                  </div>

                  {figmaTokens && (
                    <div className="bg-black/60 rounded-xl p-2.5 border border-white/5 font-mono text-[8px] text-emerald-400 space-y-1">
                      <div className="font-bold flex items-center justify-between text-zinc-400 border-b border-white/5 pb-1">
                        <span>TOKENS SYNCED</span>
                        <span>{figmaTokens.synchronizedAt}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-zinc-300">
                        <div>PRIMARY: <span style={{ color: figmaTokens.tokens.primaryColor }}>{figmaTokens.tokens.primaryColor}</span></div>
                        <div>SECONDARY: <span style={{ color: figmaTokens.tokens.secondaryColor }}>{figmaTokens.tokens.secondaryColor}</span></div>
                        <div>RADIUS: <span>{figmaTokens.tokens.borderRadius}</span></div>
                        <div>FONT: <span>{figmaTokens.tokens.typography}</span></div>
                      </div>
                      <button
                        onClick={handleApplyFigmaTokens}
                        className="w-full mt-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/20 rounded uppercase text-[8px] transition-colors"
                      >
                        Apply Variables to Sandbox Code
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* QA Accessibility Tool */}
              {activeSuiteTool === 'qa' && (
                <div className="flex-1 flex flex-col justify-between gap-3">
                  <div className="space-y-1.5">
                    <h5 className="text-[11px] font-bold text-white font-mono uppercase tracking-wider flex items-center justify-between">
                      <span>{t('Autonomous WCAG QA Agent', 'QA-агент доступности WCAG')}</span>
                      <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded ${qaScore === 100 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/10 text-red-400 animate-pulse'}`}>
                        SCORE: {qaScore}/100
                      </span>
                    </h5>
                  </div>

                  <div className="space-y-2">
                    {qaFixed ? (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center gap-3">
                        <CheckCircle className="w-8 h-8 text-emerald-400 shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-emerald-400">100% WCAG COMPLIANT SECURE</div>
                          <p className="text-[9px] text-zinc-400 font-mono mt-0.5 uppercase">All elements audited. Contrast corrected to 4.5:1. Semantic alt and ARIA landmarks injected.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5 font-mono text-[9px]">
                        <div className="text-red-400 font-bold flex items-center gap-1.5">
                          <span>❌</span> Low contrast text on primary buttons (3.2:1 contrast ratio)
                        </div>
                        <div className="text-amber-400 font-semibold flex items-center gap-1.5">
                          <span>⚠️</span> Missing alt descriptive parameters on 3 dashboard icons
                        </div>
                        <div className="text-amber-400 font-semibold flex items-center gap-1.5">
                          <span>⚠️</span> Low semantic landmark elements (use header/main instead of div)
                        </div>
                      </div>
                    )}
                  </div>

                  {!qaFixed && (
                    <button
                      onClick={handleRunQAFixes}
                      className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> Execute Autonomous WCAG Fixes
                    </button>
                  )}
                </div>
              )}

              {/* Multi-Agent Developer Swarm */}
              {activeSuiteTool === 'swarm' && (
                <div className="flex-1 flex flex-col justify-between gap-3 min-h-0">
                  <div className="space-y-1">
                    <h5 className="text-[11px] font-bold text-white font-mono uppercase tracking-wider flex items-center justify-between">
                      <span>{t('Autonomous Multi-Agent Swarm', 'Рой автономных ИИ-разработчиков')}</span>
                      <button
                        onClick={() => {
                          setSwarmActive(!swarmActive);
                          playBeep(swarmActive ? 500 : 1200, 0.08);
                        }}
                        className={`text-[8px] px-2.5 py-0.5 rounded uppercase font-mono font-bold transition-all ${
                          swarmActive ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                        }`}
                      >
                        {swarmActive ? 'PAUSE SWARM' : 'START SWARM'}
                      </button>
                    </h5>
                  </div>

                  {/* Scrolling Chat Logs Box */}
                  <div className="flex-1 bg-black/60 border border-white/5 rounded-xl p-2.5 font-mono text-[8px] h-28 overflow-y-auto space-y-2">
                    {swarmLogs.length === 0 ? (
                      <div className="text-zinc-500 text-center py-8 uppercase tracking-widest">
                        Swarm Idle. Click 'Start Swarm' to initiate agent interaction.
                      </div>
                    ) : (
                      swarmLogs.map((log, idx) => (
                        <div key={idx} className="flex flex-col gap-0.5 leading-relaxed border-b border-white/[0.02] pb-1.5">
                          <div className="flex items-center justify-between">
                            <span className={`font-bold ${log.color} uppercase tracking-wider text-[7px]`}>● {log.agent}</span>
                            <span className="text-[7px] text-zinc-500">{log.time}</span>
                          </div>
                          <p className="text-zinc-300 text-[8px] pl-2">{log.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* SECTION 2: 20 ADVANCED TECHNOLOGICAL FUNCTIONS BENTO MATRIX */}
        <div className="space-y-3 pt-2">
          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>II. 20 Elite 2026 Core Functions / Список 20 передовых функций на 2026 год</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { id: 'f31', tag: 'DOCK', labelRu: 'Динамическая сетка CSS-холста', labelEn: 'Dynamic CSS Canvas Grid Overlay', desc: 'Наложение точной координатной пиксельной сетки поверх холста', icon: <Layout className="w-3 h-3 text-indigo-400" /> },
              { id: 'f32', tag: 'AUDIO', labelRu: 'Акустический отклик интерфейса', labelEn: 'Acoustic Sound Feedback Core', desc: 'Генерация утонченных звуковых микровзаимодействий', icon: <Activity className="w-3 h-3 text-cyan-400" /> },
              { id: 'f33', tag: '3D', labelRu: 'Изометрический наклон карт в 3D', labelEn: 'Isometric 3D Card Tilter', desc: 'Реагирование карточек на наклон указателя мыши', icon: <Layers className="w-3 h-3 text-purple-400" /> },
              { id: 'f34', tag: 'SEO', labelRu: 'Авто-генератор SEO Alt-тегов', labelEn: 'Auto Alt-Tag SEO Synthesizer', desc: 'Автосинтез подписей и описаний для картинок', icon: <Globe className="w-3 h-3 text-emerald-400" /> },
              { id: 'f35', tag: 'JSON', labelRu: 'Трекер событий JSON-схем', labelEn: 'JSON Schema Event Tracker', desc: 'Логирование действий и перестроений в JSON-ноды', icon: <TerminalSquare className="w-3 h-3 text-yellow-400" /> },
              { id: 'f36', tag: 'UI', labelRu: 'Стеклянный модальный генератор', labelEn: 'Glassmorphic Modal Generator', desc: 'Создание всплывающих окон в стиле матового стекла', icon: <Sliders className="w-3 h-3 text-fuchsia-400" /> },
              { id: 'f37', tag: 'BLUR', labelRu: 'Размытие при прокрутке', labelEn: 'Scroll-Triggered Blur Effects', desc: 'Плавный размывающий шлейф при навигации по сайту', icon: <Settings2 className="w-3 h-3 text-indigo-400" /> },
              { id: 'f38', tag: 'COLOR', labelRu: 'Автономный миксер цветов', labelEn: 'Zero-Dependency Color Mixer', desc: 'Математически выверенный подбор гармоничных триад', icon: <Sparkles className="w-3 h-3 text-pink-400" /> },
              { id: 'f39', tag: 'THEME', labelRu: 'Умное переключение темы', labelEn: 'Cognitive Dark Mode Auto-Toggler', desc: 'Переключение стиля по времени суток и сенсорам', icon: <Moon className="w-3 h-3 text-blue-400" /> },
              { id: 'f40', tag: 'COMP', labelRu: 'Высокоскоростное сжатие CSS', labelEn: 'High-Velocity CSS Compressor', desc: 'Стриппинг неиспользуемых стилей перед деплоем', icon: <Flame className="w-3 h-3 text-orange-400" /> },
              { id: 'f41', tag: 'DOM', labelRu: 'Семантический HTML5 валидатор', labelEn: 'Semantic HTML5 Tree Validator', desc: 'Предотвращение некорректного вложения DOM элементов', icon: <Database className="w-3 h-3 text-teal-400" /> },
              { id: 'f42', tag: 'SPRING', labelRu: 'Пружинная анимация жидкой сетки', labelEn: 'Liquid Layout Spring Simulators', desc: 'Эффект желеобразного растяжения блоков при наведении', icon: <Zap className="w-3 h-3 text-yellow-500" /> },
              { id: 'f43', tag: 'NOISE', labelRu: 'Векторный SVG шум для карточек', labelEn: 'SVG Vector Noise Patterns', desc: 'Наложение утонченной пленочной текстуры шума на фоны', icon: <Layers className="w-3 h-3 text-zinc-400" /> },
              { id: 'f44', tag: 'MAPS', labelRu: 'Ленивая загрузка Google Maps', labelEn: 'Google Maps API Lazy-Loader', desc: 'Интеграция легковесных карт без ущерба для скорости', icon: <Globe className="w-3 h-3 text-cyan-500" /> },
              { id: 'f45', tag: 'DB', labelRu: 'Оффлайн-синхронизатор IndexedDB', labelEn: 'Offline LocalDB Syncer', desc: 'Локальное кеширование версий во избежание потерь', icon: <Database className="w-3 h-3 text-emerald-500" /> },
              { id: 'f46', tag: 'PERF', labelRu: 'Оптимизатор Lighthouse до 100%', labelEn: 'Lighthouse Performance Booster', desc: 'Асинхронный шедулинг тяжелых потоков вычислений', icon: <Activity className="w-3 h-3 text-red-400" /> },
              { id: 'f47', tag: 'OG', labelRu: 'Конструктор превью соцсетей', labelEn: 'Social Meta Previews Builder', desc: 'Предпросмотр отображения ссылки в Telegram и Discord', icon: <FileText className="w-3 h-3 text-indigo-300" /> },
              { id: 'f48', tag: 'DENS', labelRu: 'Слайдер плотности контента', labelEn: 'Fluid Container Density Slider', desc: 'Быстрое сжатие или расширение внутренних отступов', icon: <Sliders className="w-3 h-3 text-amber-400" /> },
              { id: 'f49', tag: 'VAL', labelRu: 'ИИ-валидация полей форм', labelEn: 'Smart Form Validation Synthesizer', desc: 'Мгновенное выявление ошибок ввода с подсказками', icon: <ShieldCheck className="w-3 h-3 text-emerald-400" /> },
              { id: 'f50', tag: 'CDN', labelRu: 'Симулятор CDN теплокарты', labelEn: 'Edge CDN Heatmap Simulator', desc: 'Визуализация нагрузки на узлы раздачи данных по миру', icon: <CloudLightning className="w-3 h-3 text-sky-400" /> }
            ].map(f => {
              const active = suiteFunctions[f.id] || false;
              return (
                <div
                  key={f.id}
                  className={`border rounded-xl p-2.5 flex flex-col justify-between gap-2.5 transition-all relative overflow-hidden group ${
                    active
                      ? 'bg-indigo-600/[0.02] border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.03)]'
                      : 'bg-white/[0.01] border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      {f.icon}
                      <span className="text-[7px] font-mono font-extrabold uppercase px-1 py-0.5 rounded bg-white/5 text-zinc-400">
                        {f.tag}
                      </span>
                    </div>
                    {/* Compact toggle button switch */}
                    <button
                      onClick={() => {
                        setSuiteFunctions(prev => {
                          const next = { ...prev, [f.id]: !prev[f.id] };
                          playBeep(next[f.id] ? 1000 : 450, 0.05);
                          addTerminalLog(`Function [${f.id.toUpperCase()}] status toggled to: ${next[f.id] ? 'ACTIVE' : 'DEACTIVATED'}`);
                          return next;
                        });
                      }}
                      className={`w-7 h-4 rounded-full p-0.5 transition-colors relative border ${
                        active ? 'bg-indigo-600 border-indigo-400/50' : 'bg-zinc-800 border-zinc-700'
                      }`}
                    >
                      <div className={`w-2.5 h-2.5 rounded-full bg-white shadow-md transition-transform ${
                        active ? 'translate-x-3' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  <div>
                    <h6 className="text-[10px] font-bold text-white tracking-tight leading-snug">
                      {targetLanguage === 'en' ? f.labelEn : f.labelRu}
                    </h6>
                    <p className="text-[8px] text-zinc-400 leading-normal mt-0.5 line-clamp-2">
                      {f.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };
"""

# Let's locate 'const renderPlayground = () => {' and prepend our hooks_and_helpers there
playground_decl = "  const renderPlayground = () => {"
if playground_decl in content:
    content = content.replace(playground_decl, hooks_and_helpers + "\n" + playground_decl)
    print("helpers and hooks prepended successfully.")
else:
    print("Warning: const renderPlayground not found inside content.")

# Save modified content back
open(path, 'w').write(content)
print("Saved modified file successfully!")
