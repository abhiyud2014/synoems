import React, { useState, useEffect } from 'react';
import { FaultType, KiotDiscoveredMeter } from '../types';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  PowerOff,
  RefreshCw,
  Sliders,
  Trash2,
  WifiOff,
  X,
  Zap,
} from 'lucide-react';

interface FaultInjectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  meters: KiotDiscoveredMeter[];
  preselectedMeterId?: string;
  onInjectFault: (deviceId: string, faultType: FaultType) => Promise<void>;
  onClearAllFaults: () => Promise<void>;
  onToggleAutoSimulation: (enabled: boolean) => Promise<void>;
  autoSimulationEnabled: boolean;
  activeFaults: Record<string, FaultType>;
}

const FAULT_OPTIONS: {
  id: FaultType;
  title: string;
  description: string;
  category: string;
  badge: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'low_pf',
    title: 'Low Power Factor (PF = 0.74 < 0.85)',
    description: 'Simulates uncompensated inductive load surge, high kVAR draw, and utility penalty tariff risk.',
    category: 'Power Quality',
    badge: 'border-amber-500/40 text-amber-300 bg-amber-500/10',
    icon: <Zap className="w-4 h-4 text-amber-400" />,
  },
  {
    id: 'high_thd_current',
    title: 'Current Harmonic Distortion (THD_I = 16.4%)',
    description: 'Simulates heavy 6-pulse VFD drive switching harmonics exceeding IEEE-519 5% limit.',
    category: 'Harmonics',
    badge: 'border-rose-500/40 text-rose-300 bg-rose-500/10',
    icon: <Activity className="w-4 h-4 text-rose-400" />,
  },
  {
    id: 'high_thd_voltage',
    title: 'Bus Voltage Distortion (THD_V = 7.8%)',
    description: 'Simulates voltage waveform notching and resonance on busbar risking PLC/CNC hardware.',
    category: 'Harmonics',
    badge: 'border-rose-500/40 text-rose-300 bg-rose-500/10',
    icon: <Activity className="w-4 h-4 text-rose-400" />,
  },
  {
    id: 'phase_imbalance',
    title: 'Severe 3-Phase Current Imbalance (I_R >> I_Y/B)',
    description: 'Simulates uneven single-phase load distribution and heavy neutral return current (I_N surge).',
    category: 'Phase Balance',
    badge: 'border-violet-500/40 text-violet-300 bg-violet-500/10',
    icon: <Sliders className="w-4 h-4 text-violet-400" />,
  },
  {
    id: 'gateway_offline',
    title: 'Gateway Disconnect / Drop (> 120s Timeout)',
    description: 'Sets online=0 and increments last_update_seconds to test IoT field communication failure rules.',
    category: 'IoT Gateway',
    badge: 'border-rose-500/40 text-rose-300 bg-rose-500/10',
    icon: <WifiOff className="w-4 h-4 text-rose-400" />,
  },
  {
    id: 'sensor_sentinel_fault',
    title: 'Modbus Register Corruption (Sentinel 9999/999999)',
    description: 'Sets parameter registers to error sentinel 9999 to test sensor fault & data validation logic.',
    category: 'Modbus Sensor',
    badge: 'border-rose-500/40 text-rose-300 bg-rose-500/10',
    icon: <AlertOctagon className="w-4 h-4 text-rose-400" />,
  },
  {
    id: 'undervoltage_sag',
    title: 'Grid Undervoltage Sag (184V Phase)',
    description: 'Simulates grid feeder voltage dip below nominal 230V.',
    category: 'Voltage',
    badge: 'border-amber-500/40 text-amber-300 bg-amber-500/10',
    icon: <Zap className="w-4 h-4 text-amber-400" />,
  },
  {
    id: 'overvoltage_spike',
    title: 'Overvoltage Surge (274V Phase)',
    description: 'Simulates lightning/switching transient voltage swell above nominal.',
    category: 'Voltage',
    badge: 'border-rose-500/40 text-rose-300 bg-rose-500/10',
    icon: <Zap className="w-4 h-4 text-rose-400" />,
  },
];

export const FaultInjectorModal: React.FC<FaultInjectorModalProps> = ({
  isOpen,
  onClose,
  meters,
  preselectedMeterId,
  onInjectFault,
  onClearAllFaults,
  onToggleAutoSimulation,
  autoSimulationEnabled,
  activeFaults,
}) => {
  const [selectedMeter, setSelectedMeter] = useState<string>(
    preselectedMeterId || meters[0]?.device_id || ''
  );
  const [loadingFault, setLoadingFault] = useState<string | null>(null);

  useEffect(() => {
    if (preselectedMeterId) {
      setSelectedMeter(preselectedMeterId);
    } else if (meters[0]?.device_id) {
      setSelectedMeter(meters[0].device_id);
    }
  }, [preselectedMeterId, isOpen, meters]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleInject = async (fault: FaultType) => {
    setLoadingFault(fault);
    try {
      await onInjectFault(selectedMeter, fault);
    } finally {
      setLoadingFault(null);
    }
  };

  const handleClear = async () => {
    setLoadingFault('clear');
    try {
      await onClearAllFaults();
    } finally {
      setLoadingFault(null);
    }
  };

  const currentMeterActiveFault = activeFaults[selectedMeter];

  return (
    <div
      id="fault-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm cursor-pointer"
    >
      <div
        id="fault-modal-content"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-[#0F1116] border border-slate-700 rounded shadow-2xl overflow-hidden flex flex-col max-h-[85vh] cursor-default font-mono"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-[#0A0C10] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                Industrial Anomaly & Fault Injection Lab
              </h3>
              <p className="text-xs text-slate-400">
                Trigger real-world power quality defects to test automated incident ticketing & AI diagnostics
              </p>
            </div>
          </div>

          <button
            id="fault-modal-top-close-btn"
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors flex items-center gap-1 text-xs"
            aria-label="Close fault injection lab"
          >
            <span className="hidden sm:inline">ESC / CLOSE</span>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Target Feeder Selector & Active Fault Badge */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Target Modbus Feeder
              </label>
              <select
                value={selectedMeter}
                onChange={(e) => setSelectedMeter(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-100 font-mono text-sm rounded-lg px-3 py-2 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
              >
                {meters.map((m) => (
                  <option key={m.device_id} value={m.device_id}>
                    {m.device_name} ({m.device_id})
                  </option>
                ))}
              </select>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-slate-400 block mb-1">Current Feeder State</span>
              {currentMeterActiveFault ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Fault: {currentMeterActiveFault}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Nominal Operation</span>
                </span>
              )}
            </div>
          </div>

          {/* Fault Options Grid */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Select Anomaly To Inject:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {FAULT_OPTIONS.map((fault) => {
                const isActive = currentMeterActiveFault === fault.id;

                return (
                  <button
                    key={fault.id}
                    onClick={() => handleInject(fault.id)}
                    disabled={loadingFault !== null}
                    className={`p-3 rounded-xl border text-left transition-all relative ${
                      isActive
                        ? 'border-cyan-500 bg-cyan-950/30 ring-1 ring-cyan-500/50'
                        : 'border-slate-800 bg-slate-950/60 hover:bg-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        {fault.icon}
                        <span className="text-xs font-bold text-slate-200">{fault.category}</span>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${fault.badge}`}>
                        {isActive ? 'ACTIVE' : 'INJECT'}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-slate-100 mt-1 mb-1">{fault.title}</div>
                    <div className="text-[11px] text-slate-400 leading-snug">{fault.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Global Controls & Auto Simulation */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSimulationEnabled}
                  onChange={(e) => onToggleAutoSimulation(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
              </label>
              <div>
                <div className="text-xs font-bold text-slate-200">Auto-Simulate Random Anomalies</div>
                <div className="text-[10px] text-slate-400">
                  Injects periodic industrial disturbances every ~2.5 mins
                </div>
              </div>
            </div>

            <button
              onClick={handleClear}
              disabled={loadingFault !== null}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 text-xs font-semibold transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All Active Faults</span>
            </button>
          </div>
        </div>

        {/* Modal Bottom Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-[#0A0C10] flex items-center justify-between font-mono text-xs">
          <span className="text-slate-500 text-[11px]">
            Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">ESC</kbd> to dismiss
          </span>
          <button
            id="fault-modal-footer-close-btn"
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 transition-colors flex items-center gap-1.5"
          >
            <X className="w-4 h-4" />
            <span>CLOSE DIALOG</span>
          </button>
        </div>
      </div>
    </div>
  );
};
