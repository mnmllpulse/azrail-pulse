import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useSystemState } from '../contexts/SystemStateContext';
import { Cpu, Server, ShieldCheck, Zap, Activity } from 'lucide-react';

export const SystemStatusMonitor: React.FC = () => {
  const { logicCoreLoad, systemActivity, integrityPercentage, latency } = useSystemState();
  const gaugeRef = useRef<SVGSVGElement | null>(null);

  const activeLoad = logicCoreLoad || systemActivity || 32;
  const systemIntegrity = integrityPercentage || 99.8;
  const currentLatency = latency || 18;

  // Render D3 Gauge Arc
  useEffect(() => {
    if (!gaugeRef.current) return;

    const svg = d3.select(gaugeRef.current);
    svg.selectAll('*').remove();

    const width = 160;
    const height = 160;
    const radius = Math.min(width, height) / 2 - 12;

    const g = svg
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    const arcBg = d3
      .arc()
      .innerRadius(radius - 12)
      .outerRadius(radius)
      .startAngle(-Math.PI * 0.75)
      .endAngle(Math.PI * 0.75);

    // Background track
    g.append('path')
      .attr('d', arcBg as any)
      .attr('fill', 'rgba(255, 255, 255, 0.08)');

    // Active Value Arc
    const angleScale = d3
      .scaleLinear()
      .domain([0, 100])
      .range([-Math.PI * 0.75, Math.PI * 0.75]);

    const arcVal = d3
      .arc()
      .innerRadius(radius - 12)
      .outerRadius(radius)
      .startAngle(-Math.PI * 0.75)
      .endAngle(angleScale(activeLoad));

    const defs = svg.append('defs');
    const grad = defs
      .append('linearGradient')
      .attr('id', 'gaugeGrad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '100%')
      .attr('y2', '100%');

    grad.append('stop').attr('offset', '0%').attr('stop-color', '#38bdf8');
    grad.append('stop').attr('offset', '100%').attr('stop-color', '#a855f7');

    g.append('path')
      .attr('d', arcVal as any)
      .attr('fill', 'url(#gaugeGrad)');

    // Center metric text
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.2em')
      .attr('fill', '#ffffff')
      .attr('font-size', '24px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'monospace')
      .text(`${activeLoad}%`);

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.4em')
      .attr('fill', '#94a3b8')
      .attr('font-size', '9px')
      .attr('font-family', 'monospace')
      .text('CORE LOAD');
  }, [activeLoad]);

  return (
    <div className="p-5 rounded-2xl bg-zinc-950/80 border border-purple-500/20 backdrop-blur-xl shadow-[0_0_30px_rgba(168,85,247,0.12)] space-y-4 font-mono select-none">
      <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Activity className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              SYSTEM STATUS MONITOR
            </h3>
            <p className="text-[10px] text-zinc-400">Pulse OS Kernel & Neural Engine Health</p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest bg-emerald-950/80 border border-emerald-500/40 text-emerald-400">
          HEALTHY
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6 justify-around">
        {/* D3 Gauge Arc */}
        <div className="relative w-[160px] h-[160px] flex items-center justify-center">
          <svg ref={gaugeRef} className="w-full h-full" />
        </div>

        {/* Telemetry Metrics List */}
        <div className="flex-1 space-y-3 w-full">
          <div className="p-3 rounded-xl bg-black/50 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-zinc-300 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Integrity</span>
            </div>
            <span className="text-xs font-bold text-emerald-400">{systemIntegrity}%</span>
          </div>

          <div className="p-3 rounded-xl bg-black/50 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-zinc-300 text-xs">
              <Zap className="w-4 h-4 text-purple-400" />
              <span>Model Latency</span>
            </div>
            <span className="text-xs font-bold text-purple-300">{currentLatency}ms</span>
          </div>

          <div className="p-3 rounded-xl bg-black/50 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-zinc-300 text-xs">
              <Server className="w-4 h-4 text-cyan-400" />
              <span>Audio Drone Sync</span>
            </div>
            <span className="text-xs font-bold text-cyan-300">40Hz BINAURAL</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemStatusMonitor;
