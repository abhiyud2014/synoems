import React from 'react';
import { PlantEnergySummary } from '../types';
import {
  Activity,
  AlertTriangle,
  Clock,
  Cpu,
  Layers,
  Pause,
  Play,
  RefreshCw,
  Sliders,
  Sparkles,
  Zap,
} from 'lucide-react';

interface HeaderProps {
  summary: PlantEnergySummary | null;
  refreshInterval: number;
  onSelectRefreshInterval: (interval: number) => void;
  isPaused: boolean;
  onTogglePause: () => void;
  onOpenFaultLab: () => void;
  lastUpdatedTime: Date | null;
}

export const Header: React.FC<HeaderProps> = ({
  summary,
  refreshInterval,
  onSelectRefreshInterval,
  isPaused,
  onTogglePause,
  onOpenFaultLab,
  lastUpdatedTime,
}) => {
  return (
    <header className="border-b border-slate-800 bg-[#0F1116] sticky top-0 z-40 shadow-xl select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        {/* Top Tier: Title, Telemetry Tickers, Latency & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Brand Logo & Plant ID */}
          <div className="flex items-center gap-3">
            <img src="/SynoquantLogo_blk.png" alt="Synoquant Logo" className="h-9 w-auto" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold font-mono tracking-tight text-[#E2E8F0] uppercase">
                  Synoquant <span className="text-emerald-400">EMS</span> <span className="text-emerald-400 text-xs">v4.2</span>
                </h1>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest bg-black/40 px-2 py-0.5 rounded border border-slate-800">
                  Plant: AX-9022-IND
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider flex items-center gap-2 mt-0.5">
                <span>IEC 61000-4-30 CLASS A</span>
                <span>•</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  SCADA POLLING
                </span>
              </div>
            </div>
          </div>

          {/* Center Technical Telemetry Status Ticker */}
          <div className="hidden lg:flex items-center gap-6 border-x border-slate-800/80 px-6 py-1 bg-black/20 rounded">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Gateway Status</span>
              <span className="text-xs font-mono text-emerald-400 font-medium">01 : ONLINE [POLLING]</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Last Telemetry Sync</span>
              <span className="text-xs font-mono text-slate-300">
                {lastUpdatedTime ? lastUpdatedTime.toISOString().replace('T', ' ').slice(0, 23) : 'CONNECTING...'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Network Latency</span>
              <span className="text-xs font-mono text-slate-300">24ms (Modbus-TCP)</span>
            </div>
          </div>

          {/* Right Action Controls: AI Indicator, Refresh Rate, Pause, Fault Lab */}
          <div className="flex items-center gap-2.5">
            {/* AI Copilot Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded">
              <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
              <span className="text-[11px] font-bold font-mono text-indigo-300 uppercase tracking-wide">
                AI Copilot Active
              </span>
            </div>

            {/* Auto-Refresh rate selector */}
            <div className="flex items-center gap-1.5 bg-[#0A0C10] border border-slate-800 rounded p-1 text-xs">
              <Clock className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
              <select
                value={refreshInterval}
                onChange={(e) => onSelectRefreshInterval(Number(e.target.value))}
                className="bg-transparent text-slate-300 font-mono text-xs focus:outline-none cursor-pointer pr-1"
              >
                <option value={2000} className="bg-slate-900">2s Poll</option>
                <option value={5000} className="bg-slate-900">5s Poll</option>
                <option value={10000} className="bg-slate-900">10s Poll</option>
                <option value={30000} className="bg-slate-900">30s Poll</option>
              </select>

              <button
                onClick={onTogglePause}
                className={`p-1 rounded transition-colors ${
                  isPaused
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
                title={isPaused ? 'Resume live polling' : 'Pause live polling'}
              >
                {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Anomaly / Fault Lab button */}
            <button
              onClick={onOpenFaultLab}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs font-mono font-semibold transition-all hover:border-cyan-500/40"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>FAULT LAB</span>
            </button>
          </div>
        </div>

        {/* Bottom Tier: Plant Technical Data Grid Summary */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3 pt-3 border-t border-slate-800/80">
            {/* Active Load kW */}
            <div className="bg-[#0A0C10] border border-slate-800 rounded p-3 flex flex-col justify-between">
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                Active Power (kW)
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-mono font-medium text-slate-100">
                  {summary.totalActivePowerKw.toFixed(1)}
                </span>
                <span className="text-[10px] font-mono text-cyan-400">kW</span>
              </div>
              <div className="w-full bg-slate-900 h-1 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-cyan-500 h-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (summary.totalActivePowerKw / 400) * 100)}%` }}
                />
              </div>
            </div>

            {/* Apparent Demand kVA */}
            <div className="bg-[#0A0C10] border border-slate-800 rounded p-3 flex flex-col justify-between">
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                Apparent Demand (kVA)
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-mono font-medium text-slate-100">
                  {summary.totalApparentPowerKva.toFixed(1)}
                </span>
                <span className="text-[10px] font-mono text-violet-400">kVA</span>
              </div>
              <div className="w-full bg-slate-900 h-1 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-violet-500 h-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (summary.totalApparentPowerKva / 450) * 100)}%` }}
                />
              </div>
            </div>

            {/* Plant Power Factor */}
            <div className={`bg-[#0A0C10] border rounded p-3 flex flex-col justify-between ${
              summary.averagePowerFactor < 0.85 ? 'border-red-500/50 border-l-4 border-l-red-500' : 'border-slate-800'
            }`}>
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                Power Factor (PF)
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span
                  className={`text-2xl font-mono font-medium ${
                    summary.averagePowerFactor < 0.85
                      ? 'text-red-400'
                      : summary.averagePowerFactor < 0.95
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {summary.averagePowerFactor.toFixed(3)}
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-400">
                  {summary.averagePowerFactor >= 0.95 ? 'OPTIMAL' : summary.averagePowerFactor >= 0.85 ? 'WARN' : 'PENALTY'}
                </span>
              </div>
              <div className="w-full bg-slate-900 h-1 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    summary.averagePowerFactor < 0.85
                      ? 'bg-red-500'
                      : summary.averagePowerFactor < 0.95
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, summary.averagePowerFactor * 100)}%` }}
                />
              </div>
            </div>

            {/* Gateway Status */}
            <div className="bg-[#0A0C10] border border-slate-800 rounded p-3 flex flex-col justify-between">
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                Active Meters Online
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-2xl font-mono font-medium text-emerald-400">
                  {summary.onlineMeters}
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  / {summary.onlineMeters + summary.offlineMeters} UNITS
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-2">
                {summary.offlineMeters === 0 ? 'All Feeders Nominal' : `${summary.offlineMeters} Gateway Dropout`}
              </div>
            </div>

            {/* Incident Counter */}
            <div className={`bg-[#0A0C10] border rounded p-3 flex flex-col justify-between ${
              summary.activeIncidentsCount > 0 ? 'border-red-500/40 border-l-4 border-l-red-500' : 'border-slate-800'
            }`}>
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                Incident Tickets
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span
                  className={`text-2xl font-mono font-medium ${
                    summary.activeIncidentsCount > 0 ? 'text-red-400 font-bold' : 'text-slate-200'
                  }`}
                >
                  {summary.activeIncidentsCount}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {summary.activeIncidentsCount > 0 ? 'ACTIVE SLA' : 'CLEAR'}
                </span>
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-2">
                {summary.activeIncidentsCount > 0 ? 'Action Required' : '0 Fault Alarms'}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
