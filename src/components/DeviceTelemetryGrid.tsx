import React from 'react';
import { KiotMeterReading } from '../types';
import { Download, RefreshCw, Sparkles, Terminal, AlertTriangle } from 'lucide-react';

interface DeviceTelemetryGridProps {
  readings: KiotMeterReading[];
  onRefresh: () => void;
  onSelectMeter: (deviceId: string) => void;
}

export const DeviceTelemetryGrid: React.FC<DeviceTelemetryGridProps> = ({
  readings,
  onRefresh,
  onSelectMeter,
}) => {
  const handleExportCsv = () => {
    if (readings.length === 0) return;
    const headers = [
      'Device_ID',
      'Device_Name',
      'Timestamp',
      'Phase_R_V',
      'Phase_Y_V',
      'Phase_B_V',
      'Freq_Hz',
      'Current_R_A',
      'Current_Y_A',
      'Current_B_A',
      'Neutral_A',
      'kW',
      'kVA',
      'kVAR',
      'PF',
      'THD_I_R',
      'Status_Online',
    ];
    const rows = readings.map((r) => [
      r.device_id,
      r.device_name,
      r.timestamp,
      r.electrical.V_RN,
      r.electrical.V_YN,
      r.electrical.V_BN,
      r.electrical.Freq,
      r.electrical.I_R,
      r.electrical.I_Y,
      r.electrical.I_B,
      r.electrical.I_N,
      r.electrical.kW,
      r.electrical.kVA,
      r.electrical.kVAR,
      r.electrical.PF,
      r.electrical.THD_I_R,
      r.status.online,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `KIOT_SCADA_Telemetry_Grid_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
      {/* 8 Cols: Device Telemetry Table */}
      <div className="lg:col-span-8 bg-[#0F1116] border border-slate-800 rounded flex flex-col shadow-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-800 flex justify-between items-center bg-[#0A0C10]/80">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300 font-mono">
              Device Telemetry Matrix
            </h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportCsv}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[10px] font-mono text-slate-300 border border-slate-700 flex items-center gap-1 transition-colors"
            >
              <Download className="w-3 h-3 text-cyan-400" />
              <span>EXPORT CSV</span>
            </button>
            <button
              onClick={onRefresh}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded text-[10px] font-mono text-slate-300 border border-slate-700 flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3 h-3 text-emerald-400" />
              <span>REFRESH</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="flex-1 font-mono text-xs overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-900/80 px-4 py-2.5 text-slate-500 uppercase text-[10px] tracking-wider font-bold">
              <span>Device ID</span>
              <span>Timestamp</span>
              <span>Phase R (V)</span>
              <span>Phase Y (V)</span>
              <span>Phase B (V)</span>
              <span>Freq (Hz)</span>
              <span className="text-right">Active kW</span>
            </div>

            <div className="divide-y divide-slate-800/60 max-h-[300px] overflow-y-auto">
              {readings.map((reading) => {
                const isSentinel = reading.electrical.V_RN === 9999 || reading.electrical.PF === 9999;
                return (
                  <div
                    key={reading.device_id}
                    onClick={() => onSelectMeter(reading.device_id)}
                    className={`grid grid-cols-7 px-4 py-2.5 items-center hover:bg-white/5 cursor-pointer transition-colors ${
                      isSentinel ? 'bg-red-500/10 text-red-400' : 'text-slate-300'
                    }`}
                  >
                    <span className="font-bold text-cyan-400 flex items-center gap-1.5 truncate pr-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${reading.status.online === 1 ? 'bg-emerald-400' : 'bg-red-500'}`} />
                      {reading.device_id}
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      {new Date(reading.timestamp).toTimeString().slice(0, 8)}
                    </span>
                    <span className={isSentinel ? 'text-red-400 font-bold' : 'text-slate-200'}>
                      {isSentinel ? '9999.00' : reading.electrical.V_RN.toFixed(2)}
                    </span>
                    <span className={isSentinel ? 'text-red-400 font-bold' : 'text-slate-200'}>
                      {isSentinel ? '9999.00' : reading.electrical.V_YN.toFixed(2)}
                    </span>
                    <span className={isSentinel ? 'text-red-400 font-bold' : 'text-slate-200'}>
                      {isSentinel ? '9999.00' : reading.electrical.V_BN.toFixed(2)}
                    </span>
                    <span className="text-emerald-400">
                      {isSentinel ? 'ERR' : `${reading.electrical.Freq.toFixed(2)}`}
                    </span>
                    <span className="text-right font-bold text-slate-100">
                      {isSentinel ? '999999' : `${reading.electrical.kW.toFixed(1)} kW`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 4 Cols: Diagnostic Insight Panel */}
      <div className="lg:col-span-4 bg-indigo-500/5 border border-indigo-500/20 rounded p-5 flex flex-col relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <div className="w-24 h-24 border-8 border-indigo-500 rounded-full" />
        </div>

        <div className="flex items-center gap-2 mb-3">
          <div className="w-4 h-4 bg-indigo-500 rounded-sm flex items-center justify-center text-[10px] font-bold text-white font-mono">
            AI
          </div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-300 font-mono">
            Diagnostic Insight
          </h3>
        </div>

        <div className="flex-1 space-y-3.5">
          <div className="p-3 bg-[#0A0C10]/80 rounded border border-indigo-500/20">
            <p className="text-xs text-indigo-200 leading-relaxed font-sans italic">
              "Current harmonic distortion on Feeder 1 & 2 is averaging ~4.8% with occasional non-linear surges. Power factor is maintained above 0.94 in primary busbars."
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
              Recommended Operator Actions
            </div>
            <div className="flex items-start gap-2 text-[11px] text-slate-300">
              <span className="text-indigo-400 font-mono font-bold">1.</span>
              <span>Verify APFC Capacitor Bank stage 3 readiness for upcoming peak shift.</span>
            </div>
            <div className="flex items-start gap-2 text-[11px] text-slate-300">
              <span className="text-indigo-400 font-mono font-bold">2.</span>
              <span>Monitor VFD Chiller harmonic filters for resonance with transformer inductances.</span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-indigo-500/20 flex gap-2">
          <div className="text-[10px] font-mono text-indigo-300/80">
            Engine: Gemini 3.7 Flash • SCADA Root Cause Evaluator
          </div>
        </div>
      </div>
    </div>
  );
};
