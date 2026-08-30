import React, { useState, useEffect } from 'react';
import { KiotMeterReading } from '../types';
import { Check, Code2, Copy, Globe, X } from 'lucide-react';

interface RawJsonModalProps {
  reading: KiotMeterReading | null;
  onClose: () => void;
}

export const RawJsonModal: React.FC<RawJsonModalProps> = ({ reading, onClose }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (reading) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [reading, onClose]);

  if (!reading) return null;

  const jsonString = JSON.stringify(reading, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      id="raw-json-modal-backdrop"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm cursor-pointer"
    >
      <div
        id="raw-json-modal-content"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl bg-[#0F1116] border border-slate-700 rounded shadow-2xl overflow-hidden flex flex-col max-h-[85vh] cursor-default font-mono"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-[#0A0C10] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-indigo-500/20 border border-indigo-500/40 text-indigo-400">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-100 flex items-center gap-2">
                <span>SIOT JSON TELEMETRY PAYLOAD</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                  {reading.device_id}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Globe className="w-3 h-3 text-emerald-400" />
                <code className="text-emerald-400">
                  GET /api/meters/{reading.device_id}/latest
                </code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="raw-json-copy-btn"
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'COPIED' : 'COPY JSON'}</span>
            </button>
            <button
              id="raw-json-close-btn"
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors flex items-center gap-1 text-xs"
              aria-label="Close raw JSON dialog"
            >
              <span className="hidden sm:inline">ESC / CLOSE</span>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* JSON Code Viewer */}
        <div className="p-4 flex-1 overflow-y-auto bg-[#0A0C10] font-mono text-xs text-emerald-400 border-b border-slate-800">
          <pre className="whitespace-pre overflow-x-auto leading-relaxed">{jsonString}</pre>
        </div>

        {/* Footer Schema Key Reference */}
        <div className="px-6 py-3 bg-[#0F1116] flex flex-wrap items-center justify-between text-[11px] text-slate-400 font-mono">
          <div>Status: online (0=disc, 1=valid, 2=invalid, 3=waiting)</div>
          <div>Sentinel Error Value: 9999 / 999999</div>
        </div>
      </div>
    </div>
  );
};

