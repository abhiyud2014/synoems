import React from 'react';
import { KiotMeterReading } from '../types';
import { getGatewayStatusInfo, formatSecondsAgo } from '../utils/formatters';
import { PowerFactorGauge } from './PowerFactorGauge';
import { HarmonicsGauge } from './HarmonicsGauge';
import { PhaseBalanceDiagram } from './PhaseBalanceDiagram';
import {
  Activity,
  AlertTriangle,
  Code2,
  Cpu,
  Flame,
  Gauge,
  History,
  Radio,
  Sliders,
  Sun,
  Zap,
} from 'lucide-react';

interface MeterCardProps {
  reading: KiotMeterReading;
  onOpenRawJson: (reading: KiotMeterReading) => void;
  onOpenHistorian: (deviceId: string) => void;
  onOpenFaultInjector: (deviceId: string) => void;
}

export const MeterCard: React.FC<MeterCardProps> = ({
  reading,
  onOpenRawJson,
  onOpenHistorian,
  onOpenFaultInjector,
}) => {
  const { device_id, device_name, timestamp, status, electrical } = reading;
  const statusInfo = getGatewayStatusInfo(status.online, status.last_update_seconds);

  const isSentinel = electrical.PF === 9999 || electrical.kW === 999999;
  const isHighThd =
    !isSentinel &&
    (electrical.THD_I_R > 5 ||
      electrical.THD_I_Y > 5 ||
      electrical.THD_I_B > 5 ||
      electrical.THD_V_R > 5);
  const isLowPf = !isSentinel && electrical.PF < 0.85;

  const getMeterIcon = () => {
    if (device_name.includes('CHILLER') || device_name.includes('HVAC')) return <Cpu className="w-4 h-4 text-cyan-400" />;
    if (device_name.includes('SOLAR')) return <Sun className="w-4 h-4 text-amber-400" />;
    if (device_name.includes('FURNACE')) return <Flame className="w-4 h-4 text-rose-400" />;
    if (device_name.includes('PRODUCTION') || device_name.includes('LINE')) return <Activity className="w-4 h-4 text-violet-400" />;
    return <Zap className="w-4 h-4 text-emerald-400" />;
  };

  return (
    <div
      id={`meter-card-${device_id}`}
      className={`relative bg-[#0F1116] border rounded-lg p-4 transition-all duration-200 backdrop-blur-md shadow-lg ${
        status.online === 0 || status.last_update_seconds > 120
          ? 'border-rose-500/60 border-l-4 border-l-rose-500'
          : isSentinel
          ? 'border-amber-500/60 border-l-4 border-l-amber-500'
          : isHighThd || isLowPf
          ? 'border-amber-500/40 border-l-4 border-l-amber-500'
          : 'border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Top Header Row */}
      <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
            {getMeterIcon()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold font-mono tracking-wide text-slate-100">
                {device_name}
              </h3>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700">
                {device_id}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
              <span>Updated {formatSecondsAgo(status.last_update_seconds)}</span>
              <span>•</span>
              <span className="font-mono">{new Date(timestamp).toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

        {/* Gateway Online Status Badge */}
        <div className="flex items-center gap-2">
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusInfo.badgeClass}`}
            title={statusInfo.description}
          >
            <span className={`w-2 h-2 rounded-full ${statusInfo.dotClass}`} />
            <span>{statusInfo.label}</span>
          </div>

          {/* Quick Action Toolbar */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onOpenFaultInjector(device_id)}
              className="p-1.5 rounded-md bg-slate-800/80 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/40 transition-colors"
              title="Inject Fault / Simulate Anomaly"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onOpenHistorian(device_id)}
              className="p-1.5 rounded-md bg-slate-800/80 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/40 transition-colors"
              title="View Historical Analytics"
            >
              <History className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onOpenRawJson(reading)}
              className="p-1.5 rounded-md bg-slate-800/80 hover:bg-violet-500/20 text-slate-400 hover:text-violet-300 border border-slate-700 hover:border-violet-500/40 transition-colors"
              title="View SIOT REST JSON Payload"
            >
              <Code2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Sentinel Warning Banner if Modbus Corrupted */}
      {isSentinel && (
        <div className="mt-3 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/40 text-rose-300 flex items-center gap-2 text-xs">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 animate-bounce" />
          <span className="font-medium">
            Modbus Sentinel Error <code className="font-mono font-bold bg-rose-950/60 px-1 py-0.5 rounded">9999 / 999999</code> Detected. Parameters corrupted.
          </span>
        </div>
      )}

      {/* Power Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3.5">
        <div className="bg-[#0A0C10] border border-slate-800 rounded p-2.5">
          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Active Power (kW)</div>
          <div className="text-xl font-bold font-mono text-cyan-300 mt-0.5">
            {isSentinel ? '999999' : electrical.kW.toFixed(2)}
          </div>
          <div className="text-[10px] font-mono text-slate-500">Load demand</div>
        </div>

        <div className="bg-[#0A0C10] border border-slate-800 rounded p-2.5">
          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Apparent (kVA)</div>
          <div className="text-xl font-bold font-mono text-slate-100 mt-0.5">
            {isSentinel ? '999999' : electrical.kVA.toFixed(2)}
          </div>
          <div className="text-[10px] font-mono text-slate-500">Total capacity</div>
        </div>

        <div className="bg-[#0A0C10] border border-slate-800 rounded p-2.5">
          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Reactive (kVAR)</div>
          <div className="text-xl font-bold font-mono text-amber-300 mt-0.5">
            {isSentinel ? '999999' : electrical.kVAR.toFixed(2)}
          </div>
          <div className="text-[10px] font-mono text-slate-500">Inductive draw</div>
        </div>

        <div className="bg-[#0A0C10] border border-slate-800 rounded p-2.5">
          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Cumulative Energy</div>
          <div className="text-xl font-bold font-mono text-emerald-300 mt-0.5">
            {isSentinel ? '999999' : `${electrical.kWh.toFixed(1)}`}
          </div>
          <div className="text-[10px] font-mono text-slate-500">kWh cumulative</div>
        </div>
      </div>

      {/* Voltages & Currents SCADA Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3.5">
        {/* Phase Voltages & Line Voltages */}
        <div className="bg-[#0A0C10] border border-slate-800 rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Voltages (V) • {isSentinel ? 'ERR' : `${electrical.Freq} Hz`}
            </span>
            <span className="text-[10px] font-mono text-slate-500">415V Nom 3Ø</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-slate-950 rounded p-1.5 border border-rose-500/20">
              <div className="text-[10px] font-mono text-rose-400 font-bold">V_RN</div>
              <div className="font-mono font-bold text-slate-200 mt-0.5">
                {isSentinel ? '9999' : `${electrical.V_RN}V`}
              </div>
              <div className="text-[9px] font-mono text-slate-500">Phase R</div>
            </div>

            <div className="bg-slate-950 rounded p-1.5 border border-amber-500/20">
              <div className="text-[10px] font-mono text-amber-400 font-bold">V_YN</div>
              <div className="font-mono font-bold text-slate-200 mt-0.5">
                {isSentinel ? '9999' : `${electrical.V_YN}V`}
              </div>
              <div className="text-[9px] font-mono text-slate-500">Phase Y</div>
            </div>

            <div className="bg-slate-950 rounded p-1.5 border border-blue-500/20">
              <div className="text-[10px] font-mono text-blue-400 font-bold">V_BN</div>
              <div className="font-mono font-bold text-slate-200 mt-0.5">
                {isSentinel ? '9999' : `${electrical.V_BN}V`}
              </div>
              <div className="text-[9px] font-mono text-slate-500">Phase B</div>
            </div>
          </div>

          {/* Line to Line Voltages */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs mt-2 pt-2 border-t border-slate-800/80 font-mono">
            <div>
              <span className="text-[10px] text-slate-500">V_RY: </span>
              <span className="font-semibold text-slate-300">{isSentinel ? '9999' : `${electrical.V_RY}V`}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500">V_YB: </span>
              <span className="font-semibold text-slate-300">{isSentinel ? '9999' : `${electrical.V_YB}V`}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500">V_BR: </span>
              <span className="font-semibold text-slate-300">{isSentinel ? '9999' : `${electrical.V_BR}V`}</span>
            </div>
          </div>
        </div>

        {/* Phase Currents & Neutral */}
        <div className="bg-[#0A0C10] border border-slate-800 rounded p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Phase Currents (A)
            </span>
            <span className="text-[10px] font-mono text-slate-500">0–100A Range</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
            <div className="bg-slate-950 rounded p-1.5 border border-rose-500/20">
              <div className="text-[10px] font-mono text-rose-400 font-bold">I_R</div>
              <div className="font-mono font-bold text-slate-200 mt-0.5">
                {isSentinel ? '9999' : `${electrical.I_R}A`}
              </div>
            </div>

            <div className="bg-slate-950 rounded p-1.5 border border-amber-500/20">
              <div className="text-[10px] font-mono text-amber-400 font-bold">I_Y</div>
              <div className="font-mono font-bold text-slate-200 mt-0.5">
                {isSentinel ? '9999' : `${electrical.I_Y}A`}
              </div>
            </div>

            <div className="bg-slate-950 rounded p-1.5 border border-blue-500/20">
              <div className="text-[10px] font-mono text-blue-400 font-bold">I_B</div>
              <div className="font-mono font-bold text-slate-200 mt-0.5">
                {isSentinel ? '9999' : `${electrical.I_B}A`}
              </div>
            </div>

            <div className="bg-slate-950 rounded p-1.5 border border-slate-800">
              <div className="text-[10px] font-mono text-cyan-400 font-bold">I_N</div>
              <div className="font-mono font-bold text-cyan-300 mt-0.5">
                {isSentinel ? '9999' : `${electrical.I_N}A`}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-800/80 font-mono">
            <span>Avg Current: {isSentinel ? 'ERR' : ((electrical.I_R + electrical.I_Y + electrical.I_B) / 3).toFixed(1)} A</span>
            <span>Freq: {isSentinel ? 'ERR' : `${electrical.Freq} Hz`}</span>
          </div>
        </div>
      </div>

      {/* Gauges & Power Quality Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Power Factor Dial */}
        <div className="bg-[#0A0C10] border border-slate-800 rounded p-3 flex flex-col items-center justify-between">
          <div className="w-full flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Power Factor (PF)
            </span>
            <span className="text-[10px] font-mono text-slate-500">Target ≥ 0.95</span>
          </div>
          <PowerFactorGauge value={electrical.PF} size={135} />
        </div>

        {/* Voltage Harmonics THD */}
        <HarmonicsGauge
          label="Voltage THD"
          phaseR={electrical.THD_V_R}
          phaseY={electrical.THD_V_Y}
          phaseB={electrical.THD_V_B}
          type="VOLTAGE"
        />

        {/* Current Harmonics THD */}
        <HarmonicsGauge
          label="Current THD"
          phaseR={electrical.THD_I_R}
          phaseY={electrical.THD_I_Y}
          phaseB={electrical.THD_I_B}
          type="CURRENT"
        />
      </div>
    </div>
  );
};
