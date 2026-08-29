import React, { useState, useEffect } from 'react';
import { Incident, KiotMeterReading } from '../types';
import { formatSecondsAgo } from '../utils/formatters';
import {
  AlertCircle,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  Cpu,
  DollarSign,
  History,
  Send,
  Sparkles,
  UserCheck,
  Wrench,
  X,
  Zap,
} from 'lucide-react';

interface IncidentDetailModalProps {
  incident: Incident | null;
  onClose: () => void;
  onUpdateStatus: (incidentId: string, status: Incident['status'], note?: string) => Promise<void>;
  onTriggerAiDiagnosis: (incidentId: string) => Promise<void>;
}

export const IncidentDetailModal: React.FC<IncidentDetailModalProps> = ({
  incident,
  onClose,
  onUpdateStatus,
  onTriggerAiDiagnosis,
}) => {
  const [operatorNote, setOperatorNote] = useState('');
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (incident) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [incident, onClose]);

  if (!incident) return null;

  const {
    id,
    title,
    description,
    category,
    severity,
    status,
    deviceName,
    deviceId,
    timestamp,
    assignedTo,
    slaDeadline,
    isSlaBreached,
    telemetrySnapshot,
    aiDiagnosis,
    activityLog,
  } = incident;

  const now = Date.now();
  const deadlineTime = new Date(slaDeadline).getTime();
  const remainingMins = Math.max(0, Math.round((deadlineTime - now) / 60000));

  const handleDiagnose = async () => {
    setIsDiagnosing(true);
    try {
      await onTriggerAiDiagnosis(id);
    } finally {
      setIsDiagnosing(false);
    }
  };

  const handleAddNote = async (nextStatus?: Incident['status']) => {
    setIsSaving(true);
    try {
      await onUpdateStatus(id, nextStatus || status, operatorNote || undefined);
      setOperatorNote('');
    } finally {
      setIsSaving(false);
    }
  };

  const isSentinel = telemetrySnapshot.electrical.PF === 9999;

  return (
    <div
      id="incident-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto cursor-pointer"
    >
      <div
        id="incident-modal-content"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl bg-[#0F1116] border border-slate-700 rounded shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col cursor-default"
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0A0C10]">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-800/60">
              {id}
            </span>
            <span
              className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded uppercase border ${
                severity === 'CRITICAL'
                  ? 'bg-red-500/10 text-red-300 border-red-500/40'
                  : severity === 'HIGH'
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/40'
                  : 'bg-sky-500/10 text-sky-300 border-sky-500/40'
              }`}
            >
              {severity}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {new Date(timestamp).toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="incident-modal-top-close-btn"
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              aria-label="Close modal dialog"
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors flex items-center gap-1 font-mono text-xs"
            >
              <span className="hidden sm:inline">ESC / CLOSE</span>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Incident Title & Summary Header */}
          <div>
            <h2 className="text-lg font-bold font-mono text-slate-100">{title}</h2>
            <p className="text-xs text-slate-300 mt-1">{description}</p>
          </div>

          {/* Quick Info Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded bg-[#0A0C10] border border-slate-800 text-xs font-mono">
            <div className="flex items-center gap-2.5">
              <UserCheck className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="text-slate-500 uppercase font-bold text-[10px]">Assigned Role</div>
                <div className="font-semibold text-slate-200 mt-0.5">{assignedTo}</div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-slate-500 uppercase font-bold text-[10px]">SLA Resolution Window</div>
                <div className="font-mono font-semibold mt-0.5">
                  {status === 'RESOLVED' ? (
                    <span className="text-emerald-400 font-bold">RESOLVED</span>
                  ) : isSlaBreached ? (
                    <span className="text-red-400 font-bold animate-pulse">SLA BREACHED (Overdue)</span>
                  ) : (
                    <span className={remainingMins < 15 ? 'text-red-400' : 'text-slate-200'}>
                      {remainingMins} mins remaining
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-slate-500 uppercase font-bold text-[10px]">Affected Feeder</div>
                <div className="font-mono font-semibold text-slate-200 mt-0.5">
                  {deviceName} ({deviceId})
                </div>
              </div>
            </div>
          </div>

          {/* AI Root Cause Diagnostics Section */}
          <div className="rounded border border-indigo-500/30 bg-[#0A0C10] p-4.5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs uppercase font-mono tracking-wider">
                <Bot className="w-4 h-4 text-indigo-400" />
                <span>AI Engineering Co-Pilot • Root Cause Analysis</span>
              </div>
              <button
                id="incident-modal-ai-diagnose-btn"
                type="button"
                onClick={handleDiagnose}
                disabled={isDiagnosing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold shadow-md transition-all disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isDiagnosing ? 'animate-spin' : ''}`} />
                <span>{isDiagnosing ? 'ANALYZING...' : 'RE-DIAGNOSE WITH GEMINI'}</span>
              </button>
            </div>

            {aiDiagnosis ? (
              <div className="space-y-3.5 text-xs">
                <div>
                  <div className="text-slate-400 font-mono font-bold uppercase tracking-wider text-[10px] mb-1">
                    Physical Root Cause:
                  </div>
                  <div className="text-slate-200 bg-[#0F1116] p-2.5 rounded border border-slate-800 leading-relaxed font-mono">
                    {aiDiagnosis.rootCause}
                  </div>
                </div>

                <div>
                  <div className="text-slate-400 font-mono font-bold uppercase tracking-wider text-[10px] mb-1">
                    Plant & Tariff Impact:
                  </div>
                  <div className="text-slate-300 bg-[#0F1116] p-2.5 rounded border border-slate-800 leading-relaxed font-mono">
                    {aiDiagnosis.impactAnalysis}
                    {aiDiagnosis.estimatedCostPenaltyPerHour && (
                      <div className="mt-1.5 font-mono text-amber-300 font-bold flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Penalty Rate: {aiDiagnosis.estimatedCostPenaltyPerHour}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-slate-400 font-mono font-bold uppercase tracking-wider text-[10px] mb-1">
                    Actionable Remediation Steps:
                  </div>
                  <ul className="space-y-1.5 bg-[#0F1116] p-3 rounded border border-slate-800 font-mono">
                    {aiDiagnosis.actionSteps.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-slate-200">
                        <span className="w-4 h-4 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                          {idx + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-slate-400 text-xs font-mono">
                Click "RE-DIAGNOSE WITH GEMINI" to generate root cause analysis.
              </div>
            )}
          </div>

          {/* Telemetry Snapshot at Exact Failure Millisecond */}
          <div className="rounded border border-slate-800 bg-[#0A0C10] p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                Failure Telemetry Snapshot
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Timestamp: {telemetrySnapshot.timestamp}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="bg-[#0F1116] rounded p-2 border border-slate-800">
                <div className="text-slate-500 font-mono text-[10px] uppercase font-bold">Active Load</div>
                <div className="font-mono font-bold text-emerald-400 text-sm mt-0.5">
                  {isSentinel ? '999999' : `${telemetrySnapshot.electrical.kW} kW`}
                </div>
              </div>
              <div className="bg-[#0F1116] rounded p-2 border border-slate-800">
                <div className="text-slate-500 font-mono text-[10px] uppercase font-bold">Power Factor</div>
                <div className="font-mono font-bold text-amber-400 text-sm mt-0.5">
                  {isSentinel ? '9999' : telemetrySnapshot.electrical.PF}
                </div>
              </div>
              <div className="bg-[#0F1116] rounded p-2 border border-slate-800">
                <div className="text-slate-500 font-mono text-[10px] uppercase font-bold">Voltage THD</div>
                <div className="font-mono font-bold text-slate-200 text-sm mt-0.5">
                  {isSentinel ? '9999' : `${telemetrySnapshot.electrical.THD_V_R}%`}
                </div>
              </div>
              <div className="bg-[#0F1116] rounded p-2 border border-slate-800">
                <div className="text-slate-500 font-mono text-[10px] uppercase font-bold">Current THD</div>
                <div className="font-mono font-bold text-red-400 text-sm mt-0.5">
                  {isSentinel ? '9999' : `${telemetrySnapshot.electrical.THD_I_R}%`}
                </div>
              </div>
            </div>

            {/* Detailed Phase Table */}
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[10px]">
                    <th className="pb-1.5 uppercase font-bold">Parameter</th>
                    <th className="pb-1.5 text-red-400 uppercase font-bold">Phase R</th>
                    <th className="pb-1.5 text-amber-400 uppercase font-bold">Phase Y</th>
                    <th className="pb-1.5 text-sky-400 uppercase font-bold">Phase B</th>
                    <th className="pb-1.5 uppercase font-bold">Neutral / Line</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200 text-[11px]">
                  <tr>
                    <td className="py-1 text-slate-400">Phase Voltage (V)</td>
                    <td>{telemetrySnapshot.electrical.V_RN}V</td>
                    <td>{telemetrySnapshot.electrical.V_YN}V</td>
                    <td>{telemetrySnapshot.electrical.V_BN}V</td>
                    <td>Line: {telemetrySnapshot.electrical.V_RY}V</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-400">Phase Current (A)</td>
                    <td>{telemetrySnapshot.electrical.I_R}A</td>
                    <td>{telemetrySnapshot.electrical.I_Y}A</td>
                    <td>{telemetrySnapshot.electrical.I_B}A</td>
                    <td>I_N: {telemetrySnapshot.electrical.I_N}A</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-slate-400">Current THD (%)</td>
                    <td>{telemetrySnapshot.electrical.THD_I_R}%</td>
                    <td>{telemetrySnapshot.electrical.THD_I_Y}%</td>
                    <td>{telemetrySnapshot.electrical.THD_I_B}%</td>
                    <td>Limit: 5.0%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Trail Activity Log */}
          <div className="rounded border border-slate-800 bg-[#0A0C10] p-4">
            <span className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider mb-3 block">
              Audit Trail & Activity Log
            </span>
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1 font-mono">
              {activityLog.map((act) => (
                <div key={act.id} className="text-xs border-l-2 border-slate-700 pl-3 py-0.5">
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="font-bold text-slate-300">{act.author}</span>
                    <span>•</span>
                    <span className="font-mono">{new Date(act.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-slate-200 mt-0.5">{act.action}</div>
                  {act.note && (
                    <div className="mt-1 text-slate-300 bg-[#0F1116] p-2 rounded border border-slate-800 italic">
                      "{act.note}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Operator Action & Status Transition Form */}
          <div className="rounded border border-slate-800 bg-[#0A0C10] p-4 space-y-3">
            <span className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider block">
              Operator Log & Pipeline Transition
            </span>
            <textarea
              value={operatorNote}
              onChange={(e) => setOperatorNote(e.target.value)}
              placeholder="Enter resolution notes, switchgear actions taken (e.g. Switched APFC Bank 2 ON, verified CT terminal)..."
              rows={2}
              className="w-full bg-[#0F1116] border border-slate-700 rounded p-2.5 text-xs font-mono text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
            />

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 font-mono">
              <button
                id="incident-modal-add-note-btn"
                type="button"
                onClick={() => handleAddNote()}
                disabled={!operatorNote || isSaving}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors disabled:opacity-50"
              >
                ADD NOTE ONLY
              </button>

              <div className="flex flex-wrap items-center gap-2">
                {status !== 'IN_PROGRESS' && (
                  <button
                    id="incident-modal-in-progress-btn"
                    type="button"
                    onClick={() => handleAddNote('IN_PROGRESS')}
                    disabled={isSaving}
                    className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs transition-colors"
                  >
                    MOVE TO IN PROGRESS
                  </button>
                )}
                {status !== 'PENDING_VERIFICATION' && status !== 'RESOLVED' && (
                  <button
                    id="incident-modal-verify-btn"
                    type="button"
                    onClick={() => handleAddNote('PENDING_VERIFICATION')}
                    disabled={isSaving}
                    className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-slate-950 font-bold text-xs transition-colors"
                  >
                    SUBMIT FOR VERIFICATION
                  </button>
                )}
                {status !== 'RESOLVED' && (
                  <button
                    id="incident-modal-resolve-btn"
                    type="button"
                    onClick={() => handleAddNote('RESOLVED')}
                    disabled={isSaving}
                    className="px-3.5 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs transition-colors"
                  >
                    MARK AS RESOLVED
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Footer with Close Button */}
        <div className="px-6 py-3 border-t border-slate-800 bg-[#0A0C10] flex items-center justify-between font-mono text-xs">
          <span className="text-slate-500 text-[11px]">
            Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">ESC</kbd> or click outside to dismiss
          </span>
          <button
            id="incident-modal-footer-close-btn"
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
