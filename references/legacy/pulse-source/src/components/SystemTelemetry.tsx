import React, { useState, useEffect } from 'react';
import { AreaChart, Area, ResponsiveContainer, YAxis, XAxis } from 'recharts';
import { useSystemState } from '../contexts/SystemStateContext';
import Tooltip from './Tooltip';

export const SystemTelemetry: React.FC = () => {
  const { logicCoreLoad, latency, integrityPercentage, uiPreferences } = useSystemState();
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => {
        const newData = [...prev, {
          time: Date.now(),
          load: logicCoreLoad,
          latency: latency,
          integrity: integrityPercentage
        }].slice(-20);
        return newData;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [logicCoreLoad, latency, integrityPercentage]);

  const primaryColor = uiPreferences.pulsePrimary;
  const isLight = uiPreferences.theme === 'light';

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 w-full p-8 rounded-[32px] border ${isLight ? 'bg-white border-gray-100' : 'bg-depth-nebula border-white/5'}`}>
      <Tooltip contentEn="Logic core processing utilization" contentRu="Загрузка процессора логического ядра" isLight={isLight}>
        <TelemetryCard title="CORE LOAD" value={`${logicCoreLoad}%`} color={primaryColor} data={data} dataKey="load" />
      </Tooltip>
      <Tooltip contentEn="Signal propagation delay" contentRu="Задержка распространения сигнала" isLight={isLight}>
        <TelemetryCard title="LATENCY" value={`${latency}ms`} color="#00F2FF" data={data} dataKey="latency" />
      </Tooltip>
      <Tooltip contentEn="System structure consistency" contentRu="Целостность структуры системы" isLight={isLight}>
        <TelemetryCard title="INTEGRITY" value={`${integrityPercentage}%`} color="#00FF94" data={data} dataKey="integrity" />
      </Tooltip>
    </div>
  );
};

const TelemetryCard: React.FC<{ title: string; value: string; color: string; data: any[]; dataKey: string }> = ({ title, value, color, data, dataKey }) => {
  const { uiPreferences } = useSystemState();
  const isLight = uiPreferences.theme === 'light';
  
  return (
    <div className={`p-4 rounded-2xl border ${isLight ? 'bg-gray-50 border-gray-100' : 'bg-white/5 border-white/5'} space-y-2`}>
      <div className="flex justify-between items-center">
        <span className={`text-[10px] font-bold tracking-widest ${isLight ? 'text-gray-400' : 'text-white/40'}`}>{title}</span>
        <span className="text-xs font-mono font-bold" style={{ color }}>{value}</span>
      </div>
      <div className="h-12 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area 
              type="monotone" 
              dataKey={dataKey} 
              stroke={color} 
              fillOpacity={1} 
              fill={`url(#gradient-${dataKey})`} 
              strokeWidth={2}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
