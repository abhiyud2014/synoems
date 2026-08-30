import React, { useState } from 'react';
import { KiotMeterReading, PlantEnergySummary } from '../types';
import { apiFetch } from '../utils/api';
import {
  Bot,
  Calculator,
  CheckCircle2,
  Cpu,
  DollarSign,
  HelpCircle,
  Lightbulb,
  Send,
  Sparkles,
  Zap,
} from 'lucide-react';

interface AiCopilotViewProps {
  meters: KiotMeterReading[];
  plantSummary: PlantEnergySummary | null;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const AiCopilotView: React.FC<AiCopilotViewProps> = ({ meters, plantSummary }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello! I am your **SIOT Industrial Energy AI Co-Pilot**. I am actively monitoring telemetry from ${meters.length} Modbus feeders across the facility.
      
You can ask me about **harmonic distortion mitigation (IEEE-519)**, **APFC capacitor bank stepping**, **demand charge reduction**, or **root cause analysis** on any meter or anomaly.`,
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // APFC Calculator State
  const [calcKw, setCalcKw] = useState<number>(plantSummary?.totalActivePowerKw || 85);
  const [currentPf, setCurrentPf] = useState<number>(plantSummary?.averagePowerFactor || 0.78);
  const [targetPf, setTargetPf] = useState<number>(0.985);

  const quickPrompts = [
    'Analyze plant harmonic compliance against IEEE-519 standards',
    'Calculate APFC capacitor bank sizing to reach 0.985 Power Factor',
    'Identify feeders with high reactive power (kVAR) draw',
    'Evaluate peak demand limit and provide peak shaving recommendations',
  ];

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      const res = await apiFetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: textToSend }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: data.reply || 'No response generated.',
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'assistant',
          text: 'Error contacting AI diagnostics service. Please ensure the backend server is reachable.',
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // APFC Calculation: Q_req = P * (tan(acos(PF1)) - tan(acos(PF2)))
  const apfcResult = React.useMemo(() => {
    try {
      const pf1 = Math.min(0.999, Math.max(0.4, currentPf));
      const pf2 = Math.min(1.0, Math.max(pf1, targetPf));
      const phi1 = Math.acos(pf1);
      const phi2 = Math.acos(pf2);
      const tanPhi1 = Math.tan(phi1);
      const tanPhi2 = Math.tan(phi2);
      const reqKvar = calcKw * (tanPhi1 - tanPhi2);

      // Surcharge estimated saving: 2.5% surcharge per 0.05 drop below 0.85 on typical industrial 500kVA tariff
      const penaltyAvoidanceMonthly = pf1 < 0.85 ? (0.85 - pf1) * 50 * calcKw * 0.12 * 24 * 30 : 0;

      return {
        requiredKvar: +reqKvar.toFixed(1),
        currentTan: +tanPhi1.toFixed(3),
        targetTan: +tanPhi2.toFixed(3),
        recommendedSteps: [
          `Step 1: ${Math.round(reqKvar * 0.25)} kVAR (Baseline compensation)`,
          `Step 2: ${Math.round(reqKvar * 0.35)} kVAR (Motor ramp compensation)`,
          `Step 3: ${Math.round(reqKvar * 0.40)} kVAR (Peak load trim)`,
        ],
        monthlySavings: +penaltyAvoidanceMonthly.toFixed(2),
      };
    } catch {
      return { requiredKvar: 0, currentTan: 0, targetTan: 0, recommendedSteps: [], monthlySavings: 0 };
    }
  }, [calcKw, currentPf, targetPf]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left 2 Cols: Copilot Chat */}
      <div className="lg:col-span-2 flex flex-col h-[700px] bg-[#0F1116] border border-slate-800 rounded overflow-hidden shadow-xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-[#0A0C10] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-indigo-500/20 border border-indigo-500/40 text-indigo-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 font-mono">
                <span>SIOT INDUSTRIAL AI COPILOT</span>
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Gemini 3.7 Flash Engine
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-mono text-[11px]">
                Ground-truth power quality, reactive power & transformer diagnostic assistant
              </p>
            </div>
          </div>
        </div>

        {/* Messages Feed */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 font-mono text-xs">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'assistant' && (
                <div className="w-7 h-7 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded p-3.5 text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-slate-800 text-emerald-400 border border-slate-700 font-semibold ml-auto'
                    : 'bg-[#0A0C10] border border-slate-800 text-slate-200'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>
                <div
                  className={`text-[10px] mt-1.5 font-mono ${
                    msg.sender === 'user' ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-indigo-400 p-2 font-mono">
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>Analyzing SIOT Modbus telemetry stream & synthesizing diagnostic...</span>
            </div>
          )}
        </div>

        {/* Quick Prompts Strip */}
        <div className="px-4 py-2 bg-[#0A0C10] border-t border-slate-800 flex gap-2 overflow-x-auto">
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(qp)}
              className="text-[10px] font-mono px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 whitespace-nowrap transition-colors flex items-center gap-1.5 shrink-0"
            >
              <Lightbulb className="w-3 h-3 text-amber-400" />
              <span>{qp}</span>
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-[#0A0C10] border-t border-slate-800 flex items-center gap-2">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask about Power Factor penalties, harmonics filters, maximum demand..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputQuery.trim() || loading}
            className="p-2 rounded bg-emerald-600 hover:bg-emerald-500 text-black font-bold transition-colors disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Right Column: APFC & Engineering Calculators */}
      <div className="space-y-4">
        {/* APFC Sizing Calculator */}
        <div className="bg-[#0F1116] border border-slate-800 rounded p-4.5 shadow-xl">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider font-mono mb-3">
            <Calculator className="w-4 h-4" />
            <span>APFC Capacitor Sizing Tool</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider font-mono">Active Load P (kW)</label>
              <input
                type="number"
                value={calcKw}
                onChange={(e) => setCalcKw(Number(e.target.value))}
                className="w-full bg-[#0A0C10] border border-slate-700 rounded p-1.5 font-mono text-slate-100 mt-1 focus:ring-1 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider font-mono">Current PF (cos φ₁)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.4"
                  max="0.99"
                  value={currentPf}
                  onChange={(e) => setCurrentPf(Number(e.target.value))}
                  className="w-full bg-[#0A0C10] border border-slate-700 rounded p-1.5 font-mono text-slate-100 mt-1 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider font-mono">Target PF (cos φ₂)</label>
                <input
                  type="number"
                  step="0.005"
                  min="0.85"
                  max="1.0"
                  value={targetPf}
                  onChange={(e) => setTargetPf(Number(e.target.value))}
                  className="w-full bg-[#0A0C10] border border-slate-700 rounded p-1.5 font-mono text-slate-100 mt-1 focus:ring-1 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Calculated Result Card */}
            <div className="bg-[#0A0C10] border border-amber-500/30 rounded p-3 mt-3">
              <div className="text-[10px] text-slate-500 font-mono uppercase font-bold">Required Reactive Compensation:</div>
              <div className="text-2xl font-bold font-mono text-amber-400 mt-0.5">
                {apfcResult.requiredKvar} <span className="text-sm font-normal text-slate-500">kVAR</span>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-800 space-y-1 text-[11px]">
                <div className="text-slate-300 font-mono font-bold text-[10px] uppercase">Recommended APFC Bank Staging:</div>
                {apfcResult.recommendedSteps.map((step, i) => (
                  <div key={i} className="text-slate-400 font-mono text-[10px]">
                    • {step}
                  </div>
                ))}
              </div>

              {currentPf < 0.85 && (
                <div className="mt-2.5 p-2 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-mono">
                  <span className="font-bold">Avoided Surcharge:</span> Est. ${apfcResult.monthlySavings}/mo penalty savings.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* IEEE-519 Standards Reference Guide */}
        <div className="bg-[#0F1116] border border-slate-800 rounded p-4 shadow-xl text-xs space-y-2.5">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider font-mono">
            <Cpu className="w-4 h-4" />
            <span>IEEE-519 Power Quality Thresholds</span>
          </div>

          <div className="space-y-1.5 text-[11px] text-slate-300 font-mono">
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Bus Voltage THD (V ≤ 1kV)</span>
              <span className="font-bold text-emerald-400">≤ 5.0% Max</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Individual Voltage Harmonics</span>
              <span className="font-bold text-emerald-400">≤ 3.0% Max</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Current THD (I_sc / I_L &lt; 20)</span>
              <span className="font-bold text-amber-400">≤ 5.0% Max</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800">
              <span className="text-slate-400">Power Factor Utility Baseline</span>
              <span className="font-bold text-cyan-400">≥ 0.85 (Ideal ≥ 0.95)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Phase Voltage Imbalance</span>
              <span className="font-bold text-emerald-400">≤ 3.0% Max</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
