const fs = require('fs');

let content = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

const newSecurityContent = `
                  {/* Defender Agents */}
                  <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6 space-y-6 md:col-span-2">
                    <div className="flex items-center justify-between border-b border-white/5 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-pulse-primary/20 rounded-xl">
                          <Eye className="w-5 h-5 text-pulse-primary" />
                        </div>
                        <div>
                          <h3 className="text-md font-bold font-mono uppercase tracking-wider">Defender Agents</h3>
                          <p className="text-[10px] text-zinc-500 font-mono">Real-time threat monitoring</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pulse-primary opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-pulse-primary"></span>
                        </span>
                        <span className="text-xs text-pulse-primary font-mono">ACTIVE SCANNING</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-black/30 border border-white/5 p-4 rounded-xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-pulse-primary"></div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-bold text-zinc-200">AZRAIL-Core</span>
                          <span className="text-[10px] bg-pulse-primary/20 text-pulse-primary px-2 py-1 rounded-md">Heuristics</span>
                        </div>
                        <p className="text-xs text-zinc-400 mb-4">Deep packet inspection and payload analysis. Currently monitoring 1,204 active streams.</p>
                        <div className="flex justify-between items-end">
                          <span className="text-[10px] font-mono text-emerald-400">0 anomalies detected</span>
                          <Activity className="w-4 h-4 text-zinc-600 animate-pulse" />
                        </div>
                      </div>
                      
                      <div className="bg-black/30 border border-white/5 p-4 rounded-xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-bold text-zinc-200">ANUBIS-Gate</span>
                          <span className="text-[10px] bg-amber-500/20 text-amber-500 px-2 py-1 rounded-md">Injection Shield</span>
                        </div>
                        <p className="text-xs text-zinc-400 mb-4">Validating incoming data against known XSS/SQLi vectors. Filtering raw inputs.</p>
                        <div className="flex justify-between items-end">
                          <span className="text-[10px] font-mono text-zinc-500">All gates secured</span>
                          <Shield className="w-4 h-4 text-zinc-600 animate-pulse" />
                        </div>
                      </div>
                    </div>

                    {/* Shield Status */}
                    <div className="pt-4 border-t border-white/5">
                      <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest block mb-4">Shield-Status: Data Transparency Map</span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div className="bg-black/20 border border-emerald-500/30 p-3 rounded-lg">
                          <div className="text-[10px] text-zinc-500 font-mono mb-1">LOCAL STATE</div>
                          <div className="text-xs text-emerald-400 font-bold flex items-center gap-1"><Lock className="w-3 h-3"/> Encrypted Volatile</div>
                        </div>
                        <div className="bg-black/20 border border-pulse-primary/30 p-3 rounded-lg">
                          <div className="text-[10px] text-zinc-500 font-mono mb-1">CLOUDFLARE R2</div>
                          <div className="text-xs text-pulse-primary font-bold flex items-center gap-1"><Database className="w-3 h-3"/> AES-256 E2E</div>
                        </div>
                        <div className="bg-black/20 border border-amber-500/30 p-3 rounded-lg">
                          <div className="text-[10px] text-zinc-500 font-mono mb-1">P2P MESH</div>
                          <div className="text-xs text-amber-400 font-bold flex items-center gap-1"><Globe className="w-3 h-3"/> Split Tunnel</div>
                        </div>
                      </div>
                    </div>
                  </div>
`;

content = content.replace(
  "                      </button>\n                    </div>\n                  </div>\n                </motion.div>",
  "                      </button>\n                    </div>\n                  </div>\n" + newSecurityContent + "\n                </motion.div>"
);

fs.writeFileSync('src/components/AdminPanel.tsx', content);
