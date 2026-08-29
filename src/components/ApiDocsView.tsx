import React from 'react';
import { Code2, Cpu, FileText, Globe, Key, Layers, Server, ShieldCheck } from 'lucide-react';

export const ApiDocsView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Overview Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 font-mono">
              KIOT Energy Monitoring System (EMS) • REST API Specification
            </h2>
            <p className="text-xs text-slate-400">
              High-throughput Modbus TCP & RS485 gateway data pipeline specification
            </p>
          </div>
        </div>
      </div>

      {/* Gateway Status & Error Sentinel Schema Specification */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Status Codes */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4.5 shadow-lg">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Gateway Status Codes (`status.online`)
          </h3>

          <div className="space-y-2 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <div className="flex items-center justify-between text-rose-400 font-bold">
                <span>0 = DISCONNECTED</span>
                <span className="text-[10px] text-slate-500 font-sans">last_update &gt; 120s</span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-1">
                Gateway has lost connection to the central telemetry broker or Modbus bridge.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <div className="flex items-center justify-between text-emerald-400 font-bold">
                <span>1 = CONNECTED / VALID</span>
                <span className="text-[10px] text-slate-500 font-sans">Nominal</span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-1">
                Active connection established. All electrical parameters pass sanity range checks.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <div className="flex items-center justify-between text-amber-400 font-bold">
                <span>2 = PARTIAL / INVALID PARAMS</span>
                <span className="text-[10px] text-slate-500 font-sans">Sentinel Present</span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-1">
                Gateway connected, but one or more Modbus registers returned error sentinel 9999.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <div className="flex items-center justify-between text-sky-400 font-bold">
                <span>3 = WAITING FOR DATA</span>
                <span className="text-[10px] text-slate-500 font-sans">Bootstrapping</span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-1">
                Gateway socket open; first Modbus polling cycle in progress.
              </p>
            </div>
          </div>
        </div>

        {/* Sentinel Values & Formulas */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4.5 shadow-lg">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            Sentinel Errors & Electrical Formulas
          </h3>

          <div className="space-y-2.5 text-xs font-sans">
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <div className="font-mono text-cyan-300 font-bold">9999 / 999999 Sentinel Rule</div>
              <p className="text-slate-400 text-[11px] mt-1">
                When a CT coil disconnects or a Modbus register times out, the reading must be flagged with <code className="font-mono text-rose-400">9999</code> or <code className="font-mono text-rose-400">999999</code>. UI displays invalid warning states.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <div className="font-mono text-amber-300 font-bold">3-Phase Voltage Relation</div>
              <p className="text-slate-400 font-mono text-[11px] mt-1">
                V_Line = √3 × V_Phase (e.g. 240V × 1.732 ≈ 415.7V)
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <div className="font-mono text-violet-300 font-bold">Power Triangle</div>
              <p className="text-slate-400 font-mono text-[11px] mt-1">
                S (kVA) = √(P² + Q²) • PF = P / S = cos(φ)
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
              <div className="font-mono text-emerald-300 font-bold">IEEE-519 Harmonic Limit</div>
              <p className="text-slate-400 font-mono text-[11px] mt-1">
                THD_V ≤ 5.0% (Point of Common Coupling) • THD_I ≤ 5.0%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* REST API Endpoints Catalog */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-lg space-y-4">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Globe className="w-4 h-4 text-cyan-400" />
          Exposed REST API Endpoints
        </h3>

        <div className="space-y-3 text-xs font-mono">
          {/* Endpoint 1 */}
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold text-[10px]">
                GET
              </span>
              <span className="text-slate-100 font-bold">/api/meters/discover</span>
            </div>
            <p className="text-slate-400 font-sans text-[11px] mt-1.5">
              Returns an array of all connected energy meters with device_id, device_name, location, and rated capacity.
            </p>
          </div>

          {/* Endpoint 2 */}
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold text-[10px]">
                GET
              </span>
              <span className="text-slate-100 font-bold">/api/meters/:device_id/latest</span>
            </div>
            <p className="text-slate-400 font-sans text-[11px] mt-1.5">
              Returns the latest 3-phase electrical reading payload (V_RN, V_YN, V_BN, V_RY, V_YB, V_BR, I_R, I_Y, I_B, I_N, kW, kVA, kVAR, PF, Freq, kWh, THD_V, THD_I).
            </p>
          </div>

          {/* Endpoint 3 */}
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold text-[10px]">
                GET
              </span>
              <span className="text-slate-100 font-bold">/api/meters-all/latest</span>
            </div>
            <p className="text-slate-400 font-sans text-[11px] mt-1.5">
              High-throughput single-call batch telemetry endpoint returning all connected meter readings.
            </p>
          </div>

          {/* Endpoint 4 */}
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold text-[10px]">
                GET
              </span>
              <span className="text-slate-100 font-bold">/api/meters/:device_id/history?range=24h</span>
            </div>
            <p className="text-slate-400 font-sans text-[11px] mt-1.5">
              Returns historical time-series datapoints for demand profiling and harmonics trend analysis.
            </p>
          </div>

          {/* Endpoint 5 */}
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-violet-950 text-violet-400 border border-violet-800 font-bold text-[10px]">
                POST
              </span>
              <span className="text-slate-100 font-bold">/api/ai/copilot</span>
            </div>
            <p className="text-slate-400 font-sans text-[11px] mt-1.5">
              Sends telemetry context and plant queries to the Gemini AI Engine for industrial root cause reasoning.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
