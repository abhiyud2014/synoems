import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { HistoricalDataPoint, KiotDiscoveredMeter } from '../types';
import { apiFetch } from '../utils/api';
import {
  Activity,
  Calendar,
  Clock,
  Download,
  Flame,
  Layers,
  RefreshCw,
  Zap,
} from 'lucide-react';

interface HistorianViewProps {
  meters: KiotDiscoveredMeter[];
  selectedMeterId: string;
  onSelectMeter: (id: string) => void;
}

export const HistorianView: React.FC<HistorianViewProps> = ({
  meters,
  selectedMeterId,
  onSelectMeter,
}) => {
  const [range, setRange] = useState<'1h' | '6h' | '12h' | '24h'>('24h');
  const [chartType, setChartType] = useState<'demand' | 'harmonics' | 'energy' | 'currents'>('demand');
  const [historyData, setHistoryData] = useState<HistoricalDataPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const activeMeter = meters.find((m) => m.device_id === selectedMeterId) || meters[0];

  const fetchHistory = async () => {
    if (!activeMeter) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/api/meters/${activeMeter.device_id}/history?range=${range}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.data) {
        setHistoryData(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [activeMeter?.device_id, range]);

  // Compute summary stats for the active time window
  const stats = React.useMemo(() => {
    if (!historyData || historyData.length === 0) {
      return { peakKw: 0, minPf: 1.0, avgThdI: 0, totalEnergyKwh: 0 };
    }
    let peakKw = 0;
    let minPf = 1.0;
    let sumThdI = 0;
    const startKwh = historyData[0]?.kWh || 0;
    const endKwh = historyData[historyData.length - 1]?.kWh || 0;

    historyData.forEach((d) => {
      if (d.kW > peakKw && d.kW !== 999999) peakKw = d.kW;
      if (d.PF < minPf && d.PF !== 9999 && d.PF > 0) minPf = d.PF;
      sumThdI += d.THD_I_Avg !== 9999 ? d.THD_I_Avg : 0;
    });

    return {
      peakKw: +peakKw.toFixed(2),
      minPf: +minPf.toFixed(3),
      avgThdI: +(sumThdI / historyData.length).toFixed(1),
      totalEnergyKwh: +(Math.max(0, endKwh - startKwh) || peakKw * 4).toFixed(1),
    };
  }, [historyData]);

  // Export CSV
  const handleExportCsv = () => {
    if (historyData.length === 0) return;
    const headers = [
      'Timestamp',
      'kW',
      'kVA',
      'kVAR',
      'PF',
      'Freq_Hz',
      'kWh',
      'THD_V_Avg',
      'THD_I_Avg',
      'THD_I_R',
      'THD_I_Y',
      'THD_I_B',
      'I_R',
      'I_Y',
      'I_B',
      'I_N',
      'isFault',
      'faultReason',
    ];
    const rows = historyData.map((d) => [
      d.timestamp,
      d.kW,
      d.kVA,
      d.kVAR,
      d.PF,
      d.Freq,
      d.kWh,
      d.THD_V_Avg,
      d.THD_I_Avg,
      d.THD_I_R,
      d.THD_I_Y,
      d.THD_I_B,
      d.I_Avg,
      d.I_Avg,
      d.I_Avg,
      d.I_N,
      d.isFault ? 'YES' : 'NO',
      `"${d.faultReason || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SIOT_Historian_${activeMeter?.device_name}_${range}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTimeLabel = (isoString: string) => {
    const d = new Date(isoString);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {/* Historian Header & Controls */}
      <div className="bg-[#0F1116] border border-slate-800 rounded p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex flex-wrap items-center gap-3">
          {/* Meter Selector */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
              Select Meter Feeder
            </label>
            <select
              value={selectedMeterId}
              onChange={(e) => onSelectMeter(e.target.value)}
              className="bg-[#0A0C10] border border-slate-700 text-slate-100 font-mono text-xs rounded px-3 py-1.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            >
              {meters.map((m) => (
                <option key={m.device_id} value={m.device_id}>
                  {m.device_name} ({m.rated_capacity_kva} kVA)
                </option>
              ))}
            </select>
          </div>

          {/* Time Range Selector */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
              Time Range
            </label>
            <div className="inline-flex rounded bg-[#0A0C10] p-0.5 border border-slate-800">
              {(['1h', '6h', '12h', '24h'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-3 py-1 text-xs font-mono font-bold rounded transition-colors ${
                    range === r
                      ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={fetchHistory}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>REFRESH</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs font-mono transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT CSV</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Banner for Selected Range */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#0F1116] border border-slate-800 rounded p-3.5">
          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider font-mono">
            Peak Demand in Range
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
            {stats.peakKw} <span className="text-xs text-slate-500 font-normal">kW</span>
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-0.5">Maximum active power load</div>
        </div>

        <div className="bg-[#0F1116] border border-slate-800 rounded p-3.5">
          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider font-mono">
            Minimum Power Factor
          </div>
          <div className={`text-2xl font-bold font-mono mt-1 ${stats.minPf < 0.85 ? 'text-red-400' : 'text-emerald-400'}`}>
            {stats.minPf}
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-0.5">
            {stats.minPf < 0.85 ? 'Penalty Risk Detected' : 'Nominal Power Factor'}
          </div>
        </div>

        <div className="bg-[#0F1116] border border-slate-800 rounded p-3.5">
          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider font-mono">
            Avg Current THD
          </div>
          <div className={`text-2xl font-bold font-mono mt-1 ${stats.avgThdI > 5.0 ? 'text-red-400' : 'text-slate-100'}`}>
            {stats.avgThdI}%
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-0.5">IEEE-519 ≤5.0% Standard</div>
        </div>

        <div className="bg-[#0F1116] border border-slate-800 rounded p-3.5">
          <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider font-mono">
            Energy Consumed
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {stats.totalEnergyKwh} <span className="text-xs text-slate-500 font-normal">kWh</span>
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-0.5">
            Est: ${(stats.totalEnergyKwh * 0.12).toFixed(2)} (@ $0.12/kWh)
          </div>
        </div>
      </div>

      {/* Chart Type Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setChartType('demand')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-semibold transition-all ${
            chartType === 'demand'
              ? 'bg-slate-800 text-emerald-400 border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 bg-[#0F1116]'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Demand Profile (kW vs kVA vs kVAR)</span>
        </button>

        <button
          onClick={() => setChartType('harmonics')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-semibold transition-all ${
            chartType === 'harmonics'
              ? 'bg-slate-800 text-emerald-400 border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 bg-[#0F1116]'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Harmonics Distortion (THD_V & THD_I %)</span>
        </button>

        <button
          onClick={() => setChartType('energy')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-semibold transition-all ${
            chartType === 'energy'
              ? 'bg-slate-800 text-emerald-400 border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 bg-[#0F1116]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Energy Consumption & Cost (kWh)</span>
        </button>

        <button
          onClick={() => setChartType('currents')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono font-semibold transition-all ${
            chartType === 'currents'
              ? 'bg-slate-800 text-emerald-400 border border-slate-700'
              : 'text-slate-400 hover:text-slate-200 bg-[#0F1116]'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Phase Currents & Neutral Balance (A)</span>
        </button>
      </div>

      {/* Main Interactive Chart Container */}
      <div className="bg-[#0F1116] border border-slate-800 rounded p-4 shadow-xl">
        <div className="h-[380px] w-full">
          {chartType === 'demand' && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorKw" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorKva" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorKvar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="timestamp" tickFormatter={formatTimeLabel} stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} unit=" kW" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(value: any, name: string) => [`${value}`, name]}
                  labelFormatter={(label) => new Date(label).toLocaleString()}
                />
                <Legend />
                <Area type="monotone" dataKey="kVA" name="Apparent (kVA)" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorKva)" />
                <Area type="monotone" dataKey="kW" name="Active (kW)" stroke="#06b6d4" strokeWidth={2.5} fillOpacity={1} fill="url(#colorKw)" />
                <Area type="monotone" dataKey="kVAR" name="Reactive (kVAR)" stroke="#f59e0b" strokeWidth={1.5} fillOpacity={1} fill="url(#colorKvar)" />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {chartType === 'harmonics' && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="timestamp" tickFormatter={formatTimeLabel} stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} unit=" %" domain={[0, 25]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  labelFormatter={(label) => new Date(label).toLocaleString()}
                />
                <Legend />
                {/* 5% IEEE-519 Statutory Limit Marker */}
                <ReferenceLine y={5.0} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: '5% IEEE Limit', fill: '#f43f5e', fontSize: 10 }} />
                <Line type="monotone" dataKey="THD_I_Avg" name="Avg Current THD (%)" stroke="#f43f5e" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="THD_V_Avg" name="Avg Voltage THD (%)" stroke="#06b6d4" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="THD_I_R" name="THD_I Phase R" stroke="#fb7185" strokeDasharray="2 2" dot={false} />
                <Line type="monotone" dataKey="THD_I_Y" name="THD_I Phase Y" stroke="#fbbf24" strokeDasharray="2 2" dot={false} />
                <Line type="monotone" dataKey="THD_I_B" name="THD_I Phase B" stroke="#60a5fa" strokeDasharray="2 2" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}

          {chartType === 'energy' && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorKwh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="timestamp" tickFormatter={formatTimeLabel} stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} unit=" kWh" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  labelFormatter={(label) => new Date(label).toLocaleString()}
                />
                <Legend />
                <Area type="monotone" dataKey="kWh" name="Cumulative Energy (kWh)" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorKwh)" />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {chartType === 'currents' && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={historyData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="timestamp" tickFormatter={formatTimeLabel} stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} unit=" A" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090d16', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  labelFormatter={(label) => new Date(label).toLocaleString()}
                />
                <Legend />
                <Line type="monotone" dataKey="I_Avg" name="Phase Current (A)" stroke="#38bdf8" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="I_N" name="Neutral Current I_N (A)" stroke="#e879f9" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};
