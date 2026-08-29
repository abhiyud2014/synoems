import React from 'react';
import { getPfStatus } from '../utils/formatters';

interface PowerFactorGaugeProps {
  value: number;
  size?: number;
}

export const PowerFactorGauge: React.FC<PowerFactorGaugeProps> = ({ value, size = 140 }) => {
  const isInvalid = value === 9999 || value === 999999 || isNaN(value);
  const clamped = isInvalid ? 0 : Math.min(1.0, Math.max(0, value));
  const info = getPfStatus(value);

  // Geometric configuration:
  // Arc starts at 150° (bottom-left) and sweeps 240° clockwise to 390° / 30° (bottom-right).
  // Top apex (PF 0.50) is at 270° (pointing straight up).
  const startAngleDeg = 150;
  const totalSpanDeg = 240;
  const targetAngleDeg = startAngleDeg + clamped * totalSpanDeg;

  const radius = size * 0.38;
  const cx = size / 2;
  const cy = size / 2 + size * 0.05;

  // Arc length for SVG dasharray stroke
  const totalArcLength = (totalSpanDeg / 360) * 2 * Math.PI * radius;

  // Start & End coordinates of the 240° arc
  const startRad = (startAngleDeg * Math.PI) / 180;
  const endRad = ((startAngleDeg + totalSpanDeg) * Math.PI) / 180;
  const startX = cx + radius * Math.cos(startRad);
  const startY = cy + radius * Math.sin(startRad);
  const endX = cx + radius * Math.cos(endRad);
  const endY = cy + radius * Math.sin(endRad);

  // Helper for tick calculations
  const getTickCoords = (val: number, innerOffset: number, outerOffset: number) => {
    const angleRad = ((startAngleDeg + val * totalSpanDeg) * Math.PI) / 180;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    return {
      x1: cx + (radius - innerOffset) * cos,
      y1: cy + (radius - innerOffset) * sin,
      x2: cx + (radius + outerOffset) * cos,
      y2: cy + (radius + outerOffset) * sin,
    };
  };

  // Color logic for needle
  const isLowPf = !isInvalid && clamped < 0.85;
  const isOptimal = !isInvalid && clamped >= 0.95;
  const needleColor = isInvalid
    ? '#f43f5e'
    : isLowPf
    ? '#f43f5e'
    : isOptimal
    ? '#10b981'
    : '#f59e0b';

  return (
    <div className="flex flex-col items-center justify-center relative select-none">
      <svg
        width={size}
        height={size * 0.84}
        viewBox={`0 0 ${size} ${size * 0.84}`}
        className="overflow-visible"
      >
        <defs>
          {/* Power factor multi-stop gradient along the horizontal span */}
          <linearGradient id="pfDialGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f43f5e" /> {/* Red below 0.85 */}
            <stop offset="65%" stopColor="#f59e0b" /> {/* Amber penalty boundary */}
            <stop offset="85%" stopColor="#38bdf8" /> {/* Cyan good zone */}
            <stop offset="100%" stopColor="#10b981" /> {/* Emerald optimal >0.95 */}
          </linearGradient>

          {/* Needle drop shadow for realistic analog depth */}
          <filter id="needleShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.6" />
          </filter>
        </defs>

        {/* Outer subtle guide arc */}
        <path
          d={`M ${startX} ${startY} A ${radius} ${radius} 0 1 1 ${endX} ${endY}`}
          fill="none"
          stroke="#1e293b"
          strokeWidth={size * 0.08}
          strokeLinecap="round"
        />

        {/* Penalty zone background segment (< 0.85) */}
        {(() => {
          const p85Rad = ((startAngleDeg + 0.85 * totalSpanDeg) * Math.PI) / 180;
          const p85X = cx + radius * Math.cos(p85Rad);
          const p85Y = cy + radius * Math.sin(p85Rad);
          return (
            <path
              d={`M ${startX} ${startY} A ${radius} ${radius} 0 1 1 ${p85X} ${p85Y}`}
              fill="none"
              stroke="#e11d48"
              strokeWidth={size * 0.02}
              opacity="0.3"
              strokeDasharray="2 2"
            />
          );
        })()}

        {/* Active Power Factor colored track */}
        {!isInvalid && clamped > 0 && (
          <path
            d={`M ${startX} ${startY} A ${radius} ${radius} 0 1 1 ${endX} ${endY}`}
            fill="none"
            stroke="url(#pfDialGradient)"
            strokeWidth={size * 0.075}
            strokeDasharray={`${clamped * totalArcLength} ${totalArcLength + 10}`}
            strokeLinecap="round"
          />
        )}

        {/* Minor Scale Ticks */}
        {[0.2, 0.4, 0.6, 0.8].map((t) => {
          const coords = getTickCoords(t, size * 0.03, size * 0.02);
          return (
            <line
              key={t}
              x1={coords.x1}
              y1={coords.y1}
              x2={coords.x2}
              y2={coords.y2}
              stroke="#475569"
              strokeWidth="1"
            />
          );
        })}

        {/* Major Ticks */}
        {/* 0.0 Tick */}
        {(() => {
          const c = getTickCoords(0.0, size * 0.05, size * 0.03);
          return <line x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} stroke="#64748b" strokeWidth="1.5" />;
        })()}

        {/* 0.5 Midpoint Tick */}
        {(() => {
          const c = getTickCoords(0.5, size * 0.05, size * 0.03);
          return <line x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} stroke="#64748b" strokeWidth="1.5" />;
        })()}

        {/* 0.85 Penalty Limit Tick (Red / Amber accent) */}
        {(() => {
          const c = getTickCoords(0.85, size * 0.06, size * 0.04);
          return (
            <line
              x1={c.x1}
              y1={c.y1}
              x2={c.x2}
              y2={c.y2}
              stroke="#f43f5e"
              strokeWidth="2"
            />
          );
        })()}

        {/* 0.95 Optimal Target Tick (Emerald accent) */}
        {(() => {
          const c = getTickCoords(0.95, size * 0.06, size * 0.04);
          return (
            <line
              x1={c.x1}
              y1={c.y1}
              x2={c.x2}
              y2={c.y2}
              stroke="#10b981"
              strokeWidth="2"
            />
          );
        })()}

        {/* 1.0 Tick */}
        {(() => {
          const c = getTickCoords(1.0, size * 0.05, size * 0.03);
          return <line x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} stroke="#64748b" strokeWidth="1.5" />;
        })()}

        {/* Needle */}
        {!isInvalid ? (
          <g
            transform={`rotate(${targetAngleDeg}, ${cx}, ${cy})`}
            style={{
              transition: 'transform 0.45s cubic-bezier(0.34, 1.4, 0.64, 1)',
            }}
            filter="url(#needleShadow)"
          >
            {/* Tapered Pointer Body */}
            <polygon
              points={`
                ${cx - radius * 0.18},${cy - 2.5}
                ${cx + radius * 0.88},${cy}
                ${cx - radius * 0.18},${cy + 2.5}
              `}
              fill={needleColor}
              stroke="#0f172a"
              strokeWidth="0.75"
            />
            {/* Fine Centerline on Needle */}
            <line
              x1={cx - radius * 0.1}
              y1={cy}
              x2={cx + radius * 0.85}
              y2={cy}
              stroke="#ffffff"
              strokeWidth="0.75"
              opacity="0.85"
            />
            {/* Needle Tip Indicator Dot */}
            <circle
              cx={cx + radius * 0.88}
              cy={cy}
              r="2"
              fill="#ffffff"
            />
          </g>
        ) : (
          <text
            x={cx}
            y={cy - size * 0.08}
            textAnchor="middle"
            fill="#f43f5e"
            fontSize={size * 0.09}
            fontWeight="bold"
            fontFamily="monospace"
          >
            ERR 9999
          </text>
        )}

        {/* Needle Hub / Pivot Cap */}
        <circle
          cx={cx}
          cy={cy}
          r={size * 0.065}
          fill="#1e293b"
          stroke="#475569"
          strokeWidth="1.5"
        />
        <circle
          cx={cx}
          cy={cy}
          r={size * 0.035}
          fill="#0f172a"
          stroke={needleColor}
          strokeWidth="1"
        />
        <circle
          cx={cx}
          cy={cy}
          r={size * 0.015}
          fill="#ffffff"
        />

        {/* Scale labels */}
        <text
          x={startX - 2}
          y={startY + size * 0.1}
          fill="#64748b"
          fontSize={size * 0.075}
          fontFamily="monospace"
          textAnchor="middle"
        >
          0.0
        </text>

        <text
          x={cx}
          y={cy - radius - size * 0.06}
          fill="#475569"
          fontSize={size * 0.07}
          fontFamily="monospace"
          textAnchor="middle"
        >
          0.5
        </text>

        <text
          x={endX + 2}
          y={endY + size * 0.1}
          fill="#64748b"
          fontSize={size * 0.075}
          fontFamily="monospace"
          textAnchor="middle"
        >
          1.0
        </text>
      </svg>

      {/* Numerical Readout & Penalty Status */}
      <div className="text-center mt-[-6px]">
        <div className="text-lg font-bold font-mono text-slate-100 tracking-tight flex items-center justify-center gap-1">
          {isInvalid ? (
            <span className="text-rose-400">ERR 9999</span>
          ) : (
            <span>{value.toFixed(3)}</span>
          )}
        </div>
        <div
          className={`text-[10px] font-mono font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border inline-block mt-0.5 ${
            isInvalid
              ? 'border-rose-500/40 bg-rose-500/10 text-rose-400'
              : clamped >= 0.95
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
              : clamped >= 0.85
              ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
              : 'border-rose-500/40 bg-rose-500/10 text-rose-400'
          }`}
        >
          {info.label}
        </div>
      </div>
    </div>
  );
};

