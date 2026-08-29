import React from 'react';
import { getThdStatus } from '../utils/formatters';

interface HarmonicsGaugeProps {
  label: string;
  phaseR: number;
  phaseY: number;
  phaseB: number;
  unit?: string;
  type: 'VOLTAGE' | 'CURRENT';
}

export const HarmonicsGauge: React.FC<HarmonicsGaugeProps> = ({
  label,
  phaseR,
  phaseY,
  phaseB,
  type,
}) => {
  const isInvalid = phaseR === 9999 || phaseY === 9999 || phaseB === 9999;
  const avg = isInvalid ? 0 : (phaseR + phaseY + phaseB) / 3;
  const statusInfo = getThdStatus(avg);

  const getBarColor = (val: number) => {
    if (val === 9999) return 'bg-red-500';
    if (val <= 3.0) return 'bg-emerald-400';
    if (val <= 5.0) return 'bg-amber-400';
    return 'bg-red-500';
  };

  const getWidthPercent = (val: number) => {
    if (val === 9999) return 100;
    // Scale 0 to 20% THD
    return Math.min(100, Math.max(2, (val / 15) * 100));
  };

  return (
    <div className={`bg-[#0A0C10] border rounded p-3 flex flex-col justify-between ${
      avg > 5 ? 'border-red-500/50 border-l-4 border-l-red-500' : 'border-slate-800'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${type === 'VOLTAGE' ? 'bg-cyan-400' : 'bg-amber-400'}`} />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className={`text-xs font-mono font-bold ${avg > 5 ? 'text-red-400' : 'text-slate-100'}`}>
            {isInvalid ? 'ERR 9999' : `${avg.toFixed(1)}%`}
          </span>
          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
            avg > 5 ? 'border-red-500/40 bg-red-500/10 text-red-400 font-bold' :
            avg > 3 ? 'border-amber-500/40 bg-amber-500/10 text-amber-300' :
            'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
          }`}>
            {statusInfo.status}
          </span>
        </div>
      </div>

      {/* IEEE-519 5% statutory limit guide */}
      <div className="space-y-2 my-1">
        {/* Phase R */}
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="w-4 text-rose-400 font-bold text-[10px]">R</span>
          <div className="flex-1 bg-slate-900 h-1.5 rounded-full overflow-hidden relative">
            {/* 5% line marker at (5 / 15) * 100 = 33.3% */}
            <div className="absolute top-0 bottom-0 left-[33.3%] w-[1px] bg-slate-600 z-10" />
            <div
              className={`h-full rounded-full transition-all duration-300 ${getBarColor(phaseR)}`}
              style={{ width: `${getWidthPercent(phaseR)}%` }}
            />
          </div>
          <span className="w-10 text-right text-slate-300 text-[10px]">{phaseR === 9999 ? 'ERR' : `${phaseR.toFixed(1)}%`}</span>
        </div>

        {/* Phase Y */}
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="w-4 text-amber-400 font-bold text-[10px]">Y</span>
          <div className="flex-1 bg-slate-900 h-1.5 rounded-full overflow-hidden relative">
            <div className="absolute top-0 bottom-0 left-[33.3%] w-[1px] bg-slate-600 z-10" />
            <div
              className={`h-full rounded-full transition-all duration-300 ${getBarColor(phaseY)}`}
              style={{ width: `${getWidthPercent(phaseY)}%` }}
            />
          </div>
          <span className="w-10 text-right text-slate-300 text-[10px]">{phaseY === 9999 ? 'ERR' : `${phaseY.toFixed(1)}%`}</span>
        </div>

        {/* Phase B */}
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="w-4 text-blue-400 font-bold text-[10px]">B</span>
          <div className="flex-1 bg-slate-900 h-1.5 rounded-full overflow-hidden relative">
            <div className="absolute top-0 bottom-0 left-[33.3%] w-[1px] bg-slate-600 z-10" />
            <div
              className={`h-full rounded-full transition-all duration-300 ${getBarColor(phaseB)}`}
              style={{ width: `${getWidthPercent(phaseB)}%` }}
            />
          </div>
          <span className="w-10 text-right text-slate-300 text-[10px]">{phaseB === 9999 ? 'ERR' : `${phaseB.toFixed(1)}%`}</span>
        </div>
      </div>

      <div className="flex justify-between items-center mt-2 pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-500 font-mono">
        <span>0%</span>
        <span>IEEE 519 (5%)</span>
        <span>15%+</span>
      </div>
    </div>
  );
};
