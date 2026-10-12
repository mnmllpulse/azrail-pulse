import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useSystemState } from '../contexts/SystemStateContext';
import { Activity, Cpu, Wifi, Zap } from 'lucide-react';

export const SystemPulseIndicator: React.FC = () => {
  const { systemActivity, logicCoreLoad } = useSystemState();
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [telemetry, setTelemetry] = useState<{ cpu: number; netMbps: number; latencyMs: number }>({
    cpu: 24,
    netMbps: 142.8,
    latencyMs: 22,
  });

  const [history, setHistory] = useState<number[]>(() =>
    Array.from({ length: 24 }).map(() => 20 + Math.random() * 25)
  );

  // Update telemetry metrics periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const activeLoad = logicCoreLoad || systemActivity || Math.floor(20 + Math.random() * 25);
      const net = Math.floor(110 + Math.random() * 65);
      const lat = Math.floor(16 + (activeLoad / 100) * 22);

      setTelemetry({
        cpu: activeLoad,
        netMbps: net,
        latencyMs: lat,
      });

      setHistory((prev) => [...prev.slice(1), activeLoad]);
    }, 1200);

    return () => clearInterval(interval);
  }, [logicCoreLoad, systemActivity]);

  // Render D3 sparkline graph
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 110;
    const height = 28;

    const xScale = d3
      .scaleLinear()
      .domain([0, history.length - 1])
      .range([2, width - 2]);

    const yScale = d3
      .scaleLinear()
      .domain([0, 100])
      .range([height - 2, 2]);

    const line = d3
      .line<number>()
      .x((_, i) => xScale(i))
      .y((d) => yScale(d))
      .curve(d3.curveMonotoneX);

    const area = d3
      .area<number>()
      .x((_, i) => xScale(i))
      .y0(height)
      .y1((d) => yScale(d))
      .curve(d3.curveMonotoneX);

    // Gradient definitions
    const defs = svg.append('defs');
    const gradient = defs
      .append('linearGradient')
      .attr('id', 'pulseGraphGradMain')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    gradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#38bdf8')
      .attr('stop-opacity', 0.45);

    gradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#a855f7')
      .attr('stop-opacity', 0.0);

    // Render Area
    svg
      .append('path')
      .datum(history)
      .attr('fill', 'url(#pulseGraphGradMain)')
      .attr('d', area);

    // Render Line
    svg
      .append('path')
      .datum(history)
      .attr('fill', 'none')
      .attr('stroke', '#38bdf8')
      .attr('stroke-width', 1.8)
      .attr('d', line);

    // Render pulsating lead dot
    const lastIdx = history.length - 1;
    const lastVal = history[lastIdx];

    svg
      .append('circle')
      .attr('cx', xScale(lastIdx))
      .attr('cy', yScale(lastVal))
      .attr('r', 3)
      .attr('fill', '#c084fc')
      .attr('filter', 'drop-shadow(0px 0px 4px #c084fc)');
  }, [history]);

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-zinc-950/80 border border-purple-500/20 backdrop-blur-md text-[11px] font-mono tracking-wider text-zinc-300 shadow-[0_0_15px_rgba(168,85,247,0.15)] group hover:border-purple-500/40 transition-all select-none">
      {/* Live Status Icon */}
      <div className="flex items-center gap-1.5 text-cyan-400">
        <Activity className="w-3.5 h-3.5 animate-pulse" />
        <span className="font-bold uppercase tracking-widest text-[9px] text-zinc-400">PULSE</span>
      </div>

      {/* D3 Sparkline Area Canvas */}
      <div className="w-[110px] h-[28px] relative overflow-hidden flex items-center">
        <svg ref={svgRef} className="w-full h-full overflow-visible" />
      </div>

      {/* Telemetry Metrics Pill */}
      <div className="flex items-center gap-3 border-l border-white/10 pl-2.5">
        <div className="flex items-center gap-1 text-zinc-300" title="CPU Core Load">
          <Cpu className="w-3 h-3 text-purple-400" />
          <span>{telemetry.cpu}%</span>
        </div>

        <div className="hidden sm:flex items-center gap-1 text-zinc-300" title="Network Throughput">
          <Wifi className="w-3 h-3 text-cyan-400" />
          <span>{telemetry.netMbps}M</span>
        </div>

        <div className="flex items-center gap-1 text-emerald-400 font-bold" title="Model Latency">
          <Zap className="w-3 h-3" />
          <span>{telemetry.latencyMs}ms</span>
        </div>
      </div>
    </div>
  );
};

export default SystemPulseIndicator;
