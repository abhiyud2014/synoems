import type { IncomingMessage, ServerResponse } from 'http';

let _sim: any = null;
async function getSim() {
  if (!_sim) {
    const mod = await import('./backend/kiotSimulator');
    _sim = mod.simulatorEngine;
  }
  return _sim;
}

function json(res: ServerResponse, data: any, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve({}); } });
  });
}

function matchRoute(method: string, url: string, pattern: string): { match: boolean; params: Record<string, string>; query: Record<string, string> } {
  const [path, qs] = url.split('?');
  const query: Record<string, string> = {};
  if (qs) qs.split('&').forEach(p => { const [k, v] = p.split('='); query[decodeURIComponent(k)] = decodeURIComponent(v || ''); });

  const patternParts = pattern.split('/');
  const pathParts = path.split('/');
  const params: Record<string, string> = {};
  if (patternParts.length !== pathParts.length) return { match: false, params, query };

  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = pathParts[i];
    } else if (patternParts[i] !== pathParts[i]) {
      return { match: false, params, query };
    }
  }
  return { match: true, params, query };
}

function route(url: string, pattern: string) {
  return matchRoute('GET', url, pattern);
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const url = req.url || '/';
  const method = req.method || 'GET';
  const path = url.split('?')[0];

  try {
    // Health
    if (path === '/health') { return json(res, { status: 'ok', timestamp: new Date().toISOString() }); }

    // Discover meters
    if (path === '/api/meters/discover' || path === '/api/meters') {
      const sim = await getSim();
      const meters = sim.getDiscoveredMeters();
      return json(res, meters.map((m: any) => ({ device_id: m.device_id, device_name: m.device_name, location: m.location, feeder_type: m.feeder_type, rated_capacity_kva: m.rated_capacity_kva })));
    }

    // All latest
    if (path === '/api/meters-all/latest') {
      const sim = await getSim();
      return json(res, sim.getAllLatestReadings());
    }

    // Plant summary
    if (path === '/api/plant/summary') {
      const sim = await getSim();
      return json(res, sim.getPlantSummary());
    }

    // Incidents
    if (path === '/api/incidents' && method === 'GET') {
      const sim = await getSim();
      return json(res, sim.getIncidents());
    }

    // Simulation state
    if (path === '/api/simulation/status' || path === '/api/simulation/state') {
      const sim = await getSim();
      return json(res, sim.getSimulationState());
    }

    // Single meter latest
    const m = route(path, '/api/meters/:device_id/latest');
    if (m.match) {
      const sim = await getSim();
      const reading = sim.getLatestReading(m.params.device_id);
      if (!reading) return json(res, { error: 'Device not Found' }, 404);
      return json(res, reading);
    }

    // History
    const h = route(path, '/api/meters/:device_id/history');
    if (h.match) {
      const sim = await getSim();
      const range = h.query.range || '24h';
      const METERS_LIST = sim.getDiscoveredMeters();
      const meter = METERS_LIST.find((mt: any) => mt.device_id === h.params.device_id);
      const name = meter ? meter.device_name : 'Unknown';
      return json(res, { device_id: h.params.device_id, device_name: name, range, data: sim.getHistory(h.params.device_id, range) });
    }

    // Incident status update
    const s = route(path, '/api/incidents/:id/status');
    if (s.match && method === 'POST') {
      const sim = await getSim();
      const body = await parseBody(req);
      if (!body.status) return json(res, { error: 'Status is required' }, 400);
      const updated = sim.updateIncidentStatus(s.params.id, body.status, body.author, body.note);
      if (!updated) return json(res, { error: 'Incident not found' }, 404);
      return json(res, { success: true, incident: updated, ...updated });
    }

    // Incident diagnose
    const d = route(path, '/api/incidents/:id/diagnose');
    if (d.match && method === 'POST') {
      const sim = await getSim();
      const incidents = sim.getIncidents();
      const incident = incidents.find((i: any) => i.id === d.params.id);
      if (!incident) return json(res, { error: 'Incident not found' }, 404);
      try {
        const { generateIncidentDiagnosis } = await import('./backend/geminiService');
        const diagnosis = await generateIncidentDiagnosis(incident.title, incident.category, incident.telemetrySnapshot);
        sim.updateIncidentDiagnosis(d.params.id, diagnosis);
        return json(res, { success: true, diagnosis, incident: sim.getIncidents().find((i: any) => i.id === d.params.id) });
      } catch (err: any) { return json(res, { error: 'Diagnosis failed', details: err.message }, 500); }
    }

    // Inject fault
    if (path === '/api/simulation/inject-fault' || path === '/api/simulation/fault') {
      if (method !== 'POST') return json(res, { error: 'Method not allowed' }, 405);
      const sim = await getSim();
      const body = await parseBody(req);
      const device_id = body.device_id || body.deviceId;
      const fault_type = body.fault_type || body.faultType;
      if (!device_id || !fault_type) return json(res, { error: 'device_id and fault_type are required' }, 400);
      sim.injectFault(device_id, fault_type);
      return json(res, { success: true, message: `Fault ${fault_type} injected into ${device_id}` });
    }

    // Clear faults
    if (path === '/api/simulation/clear-faults' || path === '/api/simulation/clear') {
      if (method !== 'POST') return json(res, { error: 'Method not allowed' }, 405);
      const sim = await getSim();
      sim.clearAllFaults();
      return json(res, { success: true, message: 'All simulation faults cleared' });
    }

    // Toggle auto
    if (path === '/api/simulation/toggle-auto' || path === '/api/simulation/auto') {
      if (method !== 'POST') return json(res, { error: 'Method not allowed' }, 405);
      const sim = await getSim();
      const body = await parseBody(req);
      const enabled = body.enabled !== undefined ? body.enabled : true;
      sim.setAutoFaults(Boolean(enabled));
      return json(res, { success: true, autoFaultsEnabled: Boolean(enabled) });
    }

    // AI Copilot
    if (path === '/api/ai/copilot' && method === 'POST') {
      const sim = await getSim();
      const body = await parseBody(req);
      if (!body.query) return json(res, { error: 'Query is required' }, 400);
      try {
        const { askEnergyCopilot } = await import('./backend/geminiService');
        const reply = await askEnergyCopilot(body.query, { meters: sim.getAllLatestReadings(), incidents: sim.getIncidents(), plantSummary: sim.getPlantSummary() });
        return json(res, { reply });
      } catch (err: any) { return json(res, { error: 'AI Copilot failed', details: err.message }, 500); }
    }

    return json(res, { error: 'Not Found' }, 404);
  } catch (err: any) {
    console.error('Handler error:', err);
    return json(res, { error: 'Internal Server Error', details: err.message }, 500);
  }
}
