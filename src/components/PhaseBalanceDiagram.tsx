import React from 'react';

interface PhaseBalanceDiagramProps {
  vrn: number;
  vyn: number;
  vbn: number;
  ir: number;
  iy: number;
  ib: number;
  in_: number;
  size?: number;
}

export const PhaseBalanceDiagram: React.FC<PhaseBalanceDiagramProps> = ({
  vrn,
  vyn,
  vbn,
  ir,
  iy,
  ib,
  in_,
  size = 180,
}) => {
  const isInvalid = vrn === 9999 || ir === 9999;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.42;

  // Max current for scaling phasors
  const maxI = Math.max(1, ir, iy, ib, 40);

  // Angles: Phase R = -90 deg (Top), Phase Y = 30 deg (Bottom Right), Phase B = 150 deg (Bottom Left)
  const angleR = -90 * (Math.PI / 180);
  const angleY = 30 * (Math.PI / 180);
  const angleB = 150 * (Math.PI / 180);

  // Scaled current lengths
  const lenR = (Math.min(maxI, ir) / maxI) * radius;
  const lenY = (Math.min(maxI, iy) / maxI) * radius;
  const lenB = (Math.min(maxI, ib) / maxI) * radius;

  // Phasor endpoints
  const xr = cx + lenR * Math.cos(angleR);
  const yr = cy + lenR * Math.sin(angleR);
  const xy = cx + lenY * Math.cos(angleY);
  const yy = cy + lenY * Math.sin(angleY);
  const xb = cx + lenB * Math.cos(angleB);
  const yb = cy + lenB * Math.sin(angleB);

  // Voltage imbalance percentage calculation: (Max dev from avg / avg) * 100
  const avgV = (vrn + vyn + vbn) / 3;
  const maxVDev = Math.max(Math.abs(vrn - avgV), Math.abs(vyn - avgV), Math.abs(vbn - avgV));
  const vImbalancePct = isInvalid || avgV === 0 ? 0 : (maxVDev / avgV) * 100;

  // Current imbalance
  const avgI = (ir + iy + ib) / 3;
  const maxIDev = Math.max(Math.abs(ir - avgI), Math.abs(iy - avgI), Math.abs(ib - avgI));
  const iImbalancePct = isInvalid || avgI === 0 ? 0 : (maxIDev / avgI) * 100;

  return (
    <div className="bg-slate-900/80 border border-slate-800/80 rounded-lg p-3 flex flex-col items-center">
      <div className="w-full flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Phasor & Phase Balance
        </span>
        <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
          iImbalancePct > 15 ? 'border-rose-500/40 bg-rose-500/10 text-rose-300 animate-pulse' :
          iImbalancePct > 5 ? 'border-amber-500/40 bg-amber-500/10 text-amber-300' :
          'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
        }`}>
          {isInvalid ? 'ERR 9999' : `${iImbalancePct.toFixed(1)}% Imbalance`}
        </span>
      </div>

      <div className="relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Concentric grid circles */}
          <circle cx={cx} cy={cy} r={radius * 0.33} fill="none" stroke="#1e293b" strokeDasharray="3 3" />
          <circle cx={cx} cy={cy} r={radius * 0.66} fill="none" stroke="#1e293b" strokeDasharray="3 3" />
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#334155" strokeWidth="1.5" />

          {/* Reference axes */}
          <line x1={cx - radius} y1={cy} x2={cx + radius} y2={cy} stroke="#1e293b" />
          <line x1={cx} y1={cy - radius} x2={cx} y2={cy + radius} stroke="#1e293b" />

          {!isInvalid ? (
            <>
              {/* Phase R Vector (Red) */}
              <line x1={cx} y1={cy} x2={xr} y2={yr} stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" />
              <polygon
                points={`${xr},${yr} ${xr - 4},${yr + 8} ${xr + 4},${yr + 8}`}
                fill="#f43f5e"
              />
              <text x={cx + 6} y={cy - radius + 14} fill="#f43f5e" fontSize="10" fontWeight="bold" fontFamily="monospace">
                R ({ir.toFixed(0)}A)
              </text>

              {/* Phase Y Vector (Amber) */}
              <line x1={cx} y1={cy} x2={xy} y2={yy} stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx={xy} cy={yy} r="3" fill="#f59e0b" />
              <text x={xy + 4} y={yy + 10} fill="#f59e0b" fontSize="10" fontWeight="bold" fontFamily="monospace">
                Y ({iy.toFixed(0)}A)
              </text>

              {/* Phase B Vector (Blue) */}
              <line x1={cx} y1={cy} x2={xb} y2={yb} stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx={xb} cy={yb} r="3" fill="#3b82f6" />
              <text x={xb - 34} y={yb + 10} fill="#3b82f6" fontSize="10" fontWeight="bold" fontFamily="monospace">
                B ({ib.toFixed(0)}A)
              </text>

              {/* Center point */}
              <circle cx={cx} cy={cy} r="3" fill="#94a3b8" />
            </>
          ) : (
            <text x={cx} y={cy} textAnchor="middle" fill="#f43f5e" fontSize="11" fontWeight="bold">
              INVALID DATA
            </text>
          )}
        </svg>
      </div>

      {/* Neutral return current and voltage balance info */}
      <div className="w-full grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800/80 text-[11px]">
        <div className="bg-slate-950/60 rounded px-2 py-1">
          <div className="text-slate-400">Neutral Current I_N</div>
          <div className="font-mono font-bold text-slate-200">
            {isInvalid ? 'ERR' : `${in_.toFixed(1)} A`}
          </div>
        </div>
        <div className="bg-slate-950/60 rounded px-2 py-1">
          <div className="text-slate-400">Voltage Dev %</div>
          <div className="font-mono font-bold text-slate-200">
            {isInvalid ? 'ERR' : `${vImbalancePct.toFixed(2)} %`}
          </div>
        </div>
      </div>
    </div>
  );
};
