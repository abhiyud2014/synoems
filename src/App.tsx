import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FaultType,
  Incident,
  IncidentStatus,
  KiotDiscoveredMeter,
  KiotMeterReading,
  PlantEnergySummary,
} from './types';
import { apiJson, apiFetch } from './utils/api';
import { Header } from './components/Header';
import { MeterCard } from './components/MeterCard';
import { HistorianView } from './components/HistorianView';
import { IncidentKanban } from './components/IncidentKanban';
import { IncidentDetailModal } from './components/IncidentDetailModal';
import { AiCopilotView } from './components/AiCopilotView';
import { FaultInjectorModal } from './components/FaultInjectorModal';
import { RawJsonModal } from './components/RawJsonModal';
import { ApiDocsView } from './components/ApiDocsView';
import { DeviceTelemetryGrid } from './components/DeviceTelemetryGrid';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  Bot,
  Code2,
  FileCode,
  Gauge,
  History,
  Kanban,
  Layers,
  Radio,
  Sliders,
  Zap,
} from 'lucide-react';

type TabType = 'telemetry' | 'historian' | 'incidents' | 'copilot' | 'api';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('telemetry');
  const [discoveredMeters, setDiscoveredMeters] = useState<KiotDiscoveredMeter[]>([]);
  const [readings, setReadings] = useState<Record<string, KiotMeterReading>>({});
  const [plantSummary, setPlantSummary] = useState<PlantEnergySummary | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedHistorianMeterId, setSelectedHistorianMeterId] = useState<string>('e46347828fce');

  // Modals
  const [activeJsonReading, setActiveJsonReading] = useState<KiotMeterReading | null>(null);
  const [activeIncidentDetail, setActiveIncidentDetail] = useState<Incident | null>(null);
  const activeIncidentIdRef = useRef<string | null>(null);
  const [isFaultLabOpen, setIsFaultLabOpen] = useState<boolean>(false);
  const [faultLabPreselectedId, setFaultLabPreselectedId] = useState<string>('e46347828fce');

  // Simulation State
  const [activeFaults, setActiveFaults] = useState<Record<string, FaultType>>({});
  const [autoSimEnabled, setAutoSimEnabled] = useState<boolean>(true);

  // Polling State
  const [refreshInterval, setRefreshInterval] = useState<number>(5000);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<Date | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);

  // Modal open/close handlers
  const handleOpenIncidentDetail = useCallback((incident: Incident) => {
    activeIncidentIdRef.current = incident.id;
    setActiveIncidentDetail(incident);
  }, []);

  const handleCloseIncidentDetail = useCallback(() => {
    activeIncidentIdRef.current = null;
    setActiveIncidentDetail(null);
  }, []);

  // Initial Discovery
  useEffect(() => {
    const discoverMeters = async () => {
      try {
        const data = await apiJson('/api/meters/discover');
        if (Array.isArray(data) && data.length > 0) {
          setDiscoveredMeters(data as KiotDiscoveredMeter[]);
          setSelectedHistorianMeterId((data as KiotDiscoveredMeter[])[0].device_id);
        }
      } catch (err) {
        console.error('Failed to discover meters:', err);
      } finally {
        setIsInitialLoading(false);
      }
    };

    discoverMeters();
  }, []);

  // Safe JSON fetch helper (now using API utility)
  const safeFetchJson = async (url: string) => {
    return await apiJson(url);
  };

  // Fetch telemetry & incidents
  const fetchLiveData = useCallback(async () => {
    try {
      const [readingsData, summaryData, incidentsData, simStateData] = await Promise.all([
        safeFetchJson('/api/meters-all/latest'),
        safeFetchJson('/api/plant/summary'),
        safeFetchJson('/api/incidents'),
        safeFetchJson('/api/simulation/state'),
      ]);

      if (readingsData && typeof readingsData === 'object') {
        if (Array.isArray(readingsData)) {
          const map: Record<string, KiotMeterReading> = {};
          readingsData.forEach((r: KiotMeterReading) => {
            if (r && r.device_id) {
              map[r.device_id] = r;
            }
          });
          setReadings(map);
        } else {
          setReadings(readingsData);
        }
      }
      if (summaryData) {
        setPlantSummary(summaryData);
      }
      if (Array.isArray(incidentsData)) {
        setIncidents(incidentsData);
        // If an incident detail modal is currently open, refresh its data safely via ref
        const currentOpenId = activeIncidentIdRef.current;
        if (currentOpenId) {
          const updated = incidentsData.find((i: Incident) => i.id === currentOpenId);
          if (updated && activeIncidentIdRef.current === currentOpenId) {
            setActiveIncidentDetail(updated);
          }
        }
      }
      if (simStateData) {
        const simState = simStateData as any;
        setActiveFaults(simState.currentFaults || simState.activeFaults || {});
        setAutoSimEnabled(simState.autoFaultsEnabled ?? simState.autoSimulationEnabled ?? true);
      }

      setLastUpdatedTime(new Date());
    } catch (err) {
      console.error('Error polling telemetry:', err);
    }
  }, []);

  // Polling timer
  useEffect(() => {
    fetchLiveData();
    if (isPaused) return;

    const interval = setInterval(() => {
      fetchLiveData();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchLiveData, refreshInterval, isPaused]);

  // Incident status update
  const handleUpdateIncidentStatus = async (
    incidentId: string,
    status: IncidentStatus,
    note?: string
  ) => {
    try {
      const res = await apiFetch(`/api/incidents/${incidentId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note, author: 'Lead Plant Operator' }),
      });
      const data = await res.json();
      if (data.incident) {
        setIncidents((prev) => prev.map((i) => (i.id === incidentId ? data.incident : i)));
        if (activeIncidentDetail?.id === incidentId) {
          setActiveIncidentDetail(data.incident);
        }
      }
    } catch (err) {
      console.error('Failed to update incident:', err);
    }
  };

  // AI diagnosis trigger
  const handleTriggerAiDiagnosis = async (incidentId: string) => {
    try {
      const res = await apiFetch(`/api/incidents/${incidentId}/diagnose`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.incident) {
        setIncidents((prev) => prev.map((i) => (i.id === incidentId ? data.incident : i)));
        if (activeIncidentDetail?.id === incidentId) {
          setActiveIncidentDetail(data.incident);
        }
      }
    } catch (err) {
      console.error('Failed to trigger AI diagnosis:', err);
    }
  };

  // Fault injection
  const handleInjectFault = async (deviceId: string, faultType: FaultType) => {
    try {
      await apiFetch('/api/simulation/fault', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, faultType }),
      });
      await fetchLiveData();
    } catch (err) {
      console.error('Failed to inject fault:', err);
    }
  };

  const handleClearAllFaults = async () => {
    try {
      await apiFetch('/api/simulation/clear', { method: 'POST' });
      await fetchLiveData();
    } catch (err) {
      console.error('Failed to clear faults:', err);
    }
  };

  const handleToggleAutoSimulation = async (enabled: boolean) => {
    try {
      await apiFetch('/api/simulation/toggle-auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      setAutoSimEnabled(enabled);
    } catch (err) {
      console.error('Failed to toggle auto simulation:', err);
    }
  };

  const activeIncidentCount = incidents.filter((i) => i.status !== 'RESOLVED').length;

  const readingList: KiotMeterReading[] = Object.values(readings);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Header */}
      <Header
        summary={plantSummary}
        refreshInterval={refreshInterval}
        onSelectRefreshInterval={setRefreshInterval}
        isPaused={isPaused}
        onTogglePause={() => setIsPaused(!isPaused)}
        onOpenFaultLab={() => {
          setFaultLabPreselectedId(discoveredMeters[0]?.device_id || 'MAIN_PANEL_001');
          setIsFaultLabOpen(true);
        }}
        lastUpdatedTime={lastUpdatedTime}
      />

      {/* Main Navigation Bar */}
      <nav className="border-b border-slate-800 bg-[#0F1116] sticky top-[69px] z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between overflow-x-auto">
          <div className="flex space-x-1 py-2 font-mono">
            <button
              onClick={() => setActiveTab('telemetry')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'telemetry'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Gauge className="w-3.5 h-3.5" />
              <span>LIVE TELEMETRY</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/60 text-slate-400 border border-slate-800">
                {discoveredMeters.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('historian')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'historian'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>DEMAND & HISTORIAN</span>
            </button>

            <button
              onClick={() => setActiveTab('incidents')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'incidents'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>INCIDENT PIPELINE</span>
              {activeIncidentCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">
                  {activeIncidentCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('copilot')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'copilot'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-indigo-400" />
              <span>AI COPILOT & APFC</span>
            </button>

            <button
              onClick={() => setActiveTab('api')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === 'api'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>SIOT REST API</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* Tab 1: Live SCADA Telemetry */}
        {activeTab === 'telemetry' && (
          <div className="space-y-6">
            {/* Filter / Quick Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0F1116] border border-slate-800 p-3.5 rounded">
              <div className="flex items-center gap-2 text-xs text-slate-300 font-mono">
                <Radio className="w-4 h-4 text-cyan-400" />
                <span className="font-bold uppercase tracking-wider">Plant Feeders & Sub-Meters:</span>
                <span className="text-emerald-400 font-bold">{readingList.length} Connected</span>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-500">IEEE-519 5% Threshold:</span>
                <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Active Enforcement
                </span>
              </div>
            </div>

            {/* Meter Cards Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {readingList.map((reading) => (
                <MeterCard
                  key={reading.device_id}
                  reading={reading}
                  onOpenRawJson={(r) => setActiveJsonReading(r)}
                  onOpenHistorian={(id) => {
                    setSelectedHistorianMeterId(id);
                    setActiveTab('historian');
                  }}
                  onOpenFaultInjector={(id) => {
                    setFaultLabPreselectedId(id);
                    setIsFaultLabOpen(true);
                  }}
                />
              ))}
            </div>

            {readingList.length === 0 && !isInitialLoading && (
              <div className="text-center py-16 bg-[#0F1116] rounded border border-slate-800 font-mono">
                <p className="text-slate-400 text-sm">No meter readings received yet. Polling telemetry server...</p>
              </div>
            )}

            {/* Device Telemetry Table + AI Diagnostic Insight from Technical Dashboard theme */}
            <DeviceTelemetryGrid
              readings={readingList}
              onRefresh={fetchLiveData}
              onSelectMeter={(id) => {
                setSelectedHistorianMeterId(id);
                setActiveTab('historian');
              }}
            />
          </div>
        )}

        {/* Tab 2: Historian & Demand Profile */}
        {activeTab === 'historian' && (
          <HistorianView
            meters={discoveredMeters}
            selectedMeterId={selectedHistorianMeterId}
            onSelectMeter={setSelectedHistorianMeterId}
          />
        )}

        {/* Tab 3: Incident Kanban */}
        {activeTab === 'incidents' && (
          <IncidentKanban
            incidents={incidents}
            onSelectIncident={handleOpenIncidentDetail}
            onUpdateStatus={handleUpdateIncidentStatus}
          />
        )}

        {/* Tab 4: AI Copilot */}
        {activeTab === 'copilot' && (
          <AiCopilotView meters={readingList} plantSummary={plantSummary} />
        )}

        {/* Tab 5: REST API Specs */}
        {activeTab === 'api' && <ApiDocsView />}
      </main>

      {/* Global Modals */}
      <RawJsonModal reading={activeJsonReading} onClose={() => setActiveJsonReading(null)} />

      <IncidentDetailModal
        incident={activeIncidentDetail}
        onClose={handleCloseIncidentDetail}
        onUpdateStatus={handleUpdateIncidentStatus}
        onTriggerAiDiagnosis={handleTriggerAiDiagnosis}
      />

      <FaultInjectorModal
        isOpen={isFaultLabOpen}
        onClose={() => setIsFaultLabOpen(false)}
        meters={discoveredMeters}
        preselectedMeterId={faultLabPreselectedId}
        onInjectFault={handleInjectFault}
        onClearAllFaults={handleClearAllFaults}
        onToggleAutoSimulation={handleToggleAutoSimulation}
        autoSimulationEnabled={autoSimEnabled}
        activeFaults={activeFaults}
      />

      {/* System Status Footer with Copyright and Links */}
      <footer className="bg-black border-t border-slate-800 py-4 px-6 text-[11px] font-mono text-slate-500 flex flex-col gap-3 mt-auto">
        <div className="flex flex-wrap justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>DB: CONNECTED (MODBUS-RTU/TCP)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              <span>AI: READY (GEMINI-3.7-FLASH)</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span>PORT: 3000 (EXPRESS + VITE)</span>
            <span className="text-slate-400">SYS_HEALTH_REPORT: OK (99.98% UPTIME)</span>
          </div>
        </div>
        <div className="border-t border-slate-800 pt-3 flex flex-wrap justify-between items-center">
          <span className="text-slate-600">© 2026 Synoquant Pvt. Ltd. All rights reserved.</span>
          <a href="https://www.synoquant.in/" target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:text-emerald-400 underline transition-colors">
            Visit Synoquant.in
          </a>
        </div>
      </footer>
    </div>
  );
}
export default App;
