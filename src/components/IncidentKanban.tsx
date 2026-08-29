import React, { useState } from 'react';
import { Incident, IncidentStatus, IncidentSeverity, IncidentAssigneeRole } from '../types';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  Filter,
  Plus,
  Search,
  User,
  Zap,
} from 'lucide-react';

interface IncidentKanbanProps {
  incidents: Incident[];
  onSelectIncident: (incident: Incident) => void;
  onUpdateStatus: (incidentId: string, status: IncidentStatus) => Promise<void>;
}

const COLUMNS: { id: IncidentStatus; label: string; headerColor: string }[] = [
  { id: 'NEW', label: 'New Alerts', headerColor: 'border-rose-500/60 text-rose-400 bg-rose-950/20' },
  { id: 'IN_PROGRESS', label: 'In Progress', headerColor: 'border-amber-500/60 text-amber-400 bg-amber-950/20' },
  { id: 'PENDING_VERIFICATION', label: 'Pending Verification', headerColor: 'border-sky-500/60 text-sky-400 bg-sky-950/20' },
  { id: 'RESOLVED', label: 'Resolved', headerColor: 'border-emerald-500/60 text-emerald-400 bg-emerald-950/20' },
];

export const IncidentKanban: React.FC<IncidentKanbanProps> = ({
  incidents,
  onSelectIncident,
  onUpdateStatus,
}) => {
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterAssignee, setFilterAssignee] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const filteredIncidents = incidents.filter((inc) => {
    if (filterSeverity !== 'ALL' && inc.severity !== filterSeverity) return false;
    if (filterAssignee !== 'ALL' && inc.assignedTo !== filterAssignee) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        inc.title.toLowerCase().includes(q) ||
        inc.id.toLowerCase().includes(q) ||
        inc.deviceName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getIncidentsByStatus = (status: IncidentStatus) => {
    return filteredIncidents.filter((i) => i.status === status);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: IncidentStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || draggedId;
    if (id) {
      await onUpdateStatus(id, targetStatus);
    }
    setDraggedId(null);
  };

  const getSeverityBadge = (sev: IncidentSeverity) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/40';
      case 'HIGH':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/40';
      case 'MEDIUM':
        return 'bg-sky-500/15 text-sky-300 border-sky-500/40';
      default:
        return 'bg-slate-500/15 text-slate-300 border-slate-500/40';
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Header Bar */}
      <div className="bg-[#0F1116] border border-slate-800 rounded p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex flex-1 items-center gap-3 min-w-[280px]">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search incidents, feeders, ID..."
              className="w-full bg-[#0A0C10] border border-slate-700 rounded pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
            />
          </div>

          {/* Severity Filter */}
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-[#0A0C10] border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="HIGH">High Only</option>
            <option value="MEDIUM">Medium Only</option>
          </select>

          {/* Assignee Filter */}
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="bg-[#0A0C10] border border-slate-700 text-slate-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
          >
            <option value="ALL">All Roles</option>
            <option value="Senior Electrical Engineer">Senior Electrical Engineer</option>
            <option value="IoT Field Technician">IoT Field Technician</option>
            <option value="Plant Energy Manager">Plant Energy Manager</option>
            <option value="Substation Operator">Substation Operator</option>
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="text-emerald-400 font-bold">{filteredIncidents.length}</span>
          <span>INCIDENTS QUEUED</span>
        </div>
      </div>

      {/* Kanban Pipeline Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const columnIncidents = getIncidentsByStatus(col.id);

          return (
            <div
              key={col.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
              className="bg-[#0F1116] border border-slate-800 rounded flex flex-col min-h-[580px] shadow-lg overflow-hidden"
            >
              {/* Column Header */}
              <div className={`p-3 border-b flex items-center justify-between ${col.headerColor}`}>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs uppercase tracking-wider font-mono">{col.label}</span>
                </div>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-black/60 border border-slate-700 text-slate-200">
                  {columnIncidents.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="flex-1 p-2.5 space-y-2.5 overflow-y-auto max-h-[calc(100vh-280px)]">
                {columnIncidents.map((incident) => {
                  const now = Date.now();
                  const deadline = new Date(incident.slaDeadline).getTime();
                  const minsRemaining = Math.max(0, Math.round((deadline - now) / 60000));
                  const isBreached = incident.status !== 'RESOLVED' && now > deadline;

                  return (
                    <div
                      key={incident.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, incident.id)}
                      onClick={() => onSelectIncident(incident)}
                      className={`group bg-[#0A0C10] border rounded p-3 cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-slate-600 relative ${
                        isBreached
                          ? 'border-red-500/60 border-l-4 border-l-red-500'
                          : 'border-slate-800'
                      }`}
                    >
                      {/* Top info */}
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="font-mono text-[11px] font-bold text-cyan-400">
                          {incident.id}
                        </span>
                        <span
                          className={`text-[10px] font-mono font-bold uppercase px-1.5 py-0.2 rounded border ${getSeverityBadge(
                            incident.severity
                          )}`}
                        >
                          {incident.severity}
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className="text-xs font-bold text-slate-100 group-hover:text-cyan-300 transition-colors line-clamp-2 leading-snug mb-2 font-mono">
                        {incident.title}
                      </h4>

                      {/* Feeder & Assignee Badge */}
                      <div className="space-y-1 text-[11px] text-slate-400 mb-2.5">
                        <div className="flex items-center gap-1.5 font-mono text-slate-300">
                          <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                          <span className="truncate">{incident.deviceName}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <User className="w-3 h-3 text-cyan-400 shrink-0" />
                          <span className="truncate">{incident.assignedTo}</span>
                        </div>
                      </div>

                      {/* AI Root cause snippet if present */}
                      {incident.aiDiagnosis && (
                        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded p-1.5 text-[10px] text-indigo-200 flex items-start gap-1.5 mb-2.5">
                          <Bot className="w-3 h-3 text-indigo-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2 leading-tight">
                            {incident.aiDiagnosis.rootCause}
                          </span>
                        </div>
                      )}

                      {/* Footer & SLA Timer */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[10px]">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {incident.status === 'RESOLVED' ? (
                            <span className="text-emerald-400 font-bold font-mono">RESOLVED</span>
                          ) : isBreached ? (
                            <span className="text-red-400 font-mono font-bold animate-pulse">
                              SLA BREACHED
                            </span>
                          ) : (
                            <span
                              className={`font-mono ${
                                minsRemaining < 15 ? 'text-amber-400 font-bold' : 'text-slate-400'
                              }`}
                            >
                              {minsRemaining}m SLA
                            </span>
                          )}
                        </div>

                        {/* Fast stage push buttons */}
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                          {incident.status === 'NEW' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateStatus(incident.id, 'IN_PROGRESS');
                              }}
                              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-amber-600 hover:text-slate-950 text-slate-300 text-[10px] font-mono font-bold transition-colors"
                              title="Start Work"
                            >
                              START →
                            </button>
                          )}
                          {incident.status === 'IN_PROGRESS' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateStatus(incident.id, 'PENDING_VERIFICATION');
                              }}
                              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-sky-600 hover:text-slate-950 text-slate-300 text-[10px] font-mono font-bold transition-colors"
                              title="Submit for Verification"
                            >
                              VERIFY →
                            </button>
                          )}
                          {incident.status === 'PENDING_VERIFICATION' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onUpdateStatus(incident.id, 'RESOLVED');
                              }}
                              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-emerald-600 hover:text-slate-950 text-slate-300 text-[10px] font-mono font-bold transition-colors"
                              title="Resolve"
                            >
                              CLOSE ✓
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {columnIncidents.length === 0 && (
                  <div className="text-center py-12 text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
                    No tickets in this column
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
