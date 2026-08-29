import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { simulatorEngine, METERS } from './server/kiotSimulator';
import { generateIncidentDiagnosis, askEnergyCopilot } from './server/geminiService';

dotenv.config();

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

app.use(express.json());

// ==========================================
// 0. HEALTH CHECK
// ==========================================

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ==========================================
// 1. KIOT SPECIFICATION ENDPOINTS
// ==========================================

app.get(['/api/meters/discover', '/api/meters'], (req: Request, res: Response) => {
  const meters = simulatorEngine.getDiscoveredMeters();
  res.json(
    meters.map((m) => ({
      device_id: m.device_id,
      device_name: m.device_name,
      location: m.location,
      feeder_type: m.feeder_type,
      rated_capacity_kva: m.rated_capacity_kva,
    }))
  );
});

app.get('/api/meters/:device_id/latest', (req: Request, res: Response) => {
  const { device_id } = req.params;
  if (!device_id || typeof device_id !== 'string') {
    return res.status(400).json({ error: 'Invalid Device ID (Malformed Request)' });
  }
  const reading = simulatorEngine.getLatestReading(device_id);
  if (!reading) {
    return res.status(404).json({ error: 'Device not Found' });
  }
  res.json(reading);
});

// ==========================================
// 2. EMS EXTENDED TELEMETRY & HISTORIAN
// ==========================================

app.get('/api/meters-all/latest', (req: Request, res: Response) => {
  const allReadings = simulatorEngine.getAllLatestReadings();
  res.json(allReadings);
});

app.get('/api/meters/:device_id/history', (req: Request, res: Response) => {
  const { device_id } = req.params;
  const range = (req.query.range as string) || '24h';
  const meter = METERS.find((m) => m.device_id === device_id);
  if (!meter) {
    return res.status(404).json({ error: 'Device not Found' });
  }
  const history = simulatorEngine.getHistory(device_id, range);
  res.json({ device_id, device_name: meter.device_name, range, data: history });
});

app.get('/api/plant/summary', (req: Request, res: Response) => {
  const summary = simulatorEngine.getPlantSummary();
  res.json(summary);
});

// ==========================================
// 3. INCIDENT TICKETING & ALERTS
// ==========================================

app.get('/api/incidents', (req: Request, res: Response) => {
  const incidents = simulatorEngine.getIncidents();
  res.json(incidents);
});

app.all('/api/incidents/:id/status', (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, author, note } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }
  const updated = simulatorEngine.updateIncidentStatus(id, status, author, note);
  if (!updated) {
    return res.status(404).json({ error: 'Incident not found' });
  }
  res.json({ success: true, incident: updated, ...updated });
});

app.all('/api/incidents/:id/diagnose', async (req: Request, res: Response) => {
  const { id } = req.params;
  const incidents = simulatorEngine.getIncidents();
  const incident = incidents.find((i) => i.id === id);
  if (!incident) {
    return res.status(404).json({ error: 'Incident not found' });
  }
  try {
    const diagnosis = await generateIncidentDiagnosis(
      incident.title,
      incident.category,
      incident.telemetrySnapshot
    );
    simulatorEngine.updateIncidentDiagnosis(id, diagnosis);
    const updated = simulatorEngine.getIncidents().find((i) => i.id === id);
    res.json({ success: true, diagnosis, incident: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Diagnosis failed', details: err.message });
  }
});

// ==========================================
// 4. SIMULATION CONTROL & ANOMALY INJECTION
// ==========================================

app.get(['/api/simulation/status', '/api/simulation/state'], (req: Request, res: Response) => {
  const state = simulatorEngine.getSimulationState();
  res.json(state);
});

app.post(['/api/simulation/inject-fault', '/api/simulation/fault'], (req: Request, res: Response) => {
  const device_id = req.body.device_id || req.body.deviceId;
  const fault_type = req.body.fault_type || req.body.faultType;
  if (!device_id || !fault_type) {
    return res.status(400).json({ error: 'device_id and fault_type are required' });
  }
  simulatorEngine.injectFault(device_id, fault_type);
  res.json({ success: true, message: `Fault ${fault_type} injected into ${device_id}` });
});

app.post(['/api/simulation/clear-faults', '/api/simulation/clear'], (req: Request, res: Response) => {
  simulatorEngine.clearAllFaults();
  res.json({ success: true, message: 'All simulation faults cleared' });
});

app.post(['/api/simulation/toggle-auto', '/api/simulation/auto'], (req: Request, res: Response) => {
  const enabled = req.body.enabled !== undefined ? req.body.enabled : true;
  simulatorEngine.setAutoFaults(Boolean(enabled));
  res.json({ success: true, autoFaultsEnabled: Boolean(enabled) });
});

// ==========================================
// 5. AI COPILOT CONVERSATIONAL ASSISTANT
// ==========================================

app.post('/api/ai/copilot', async (req: Request, res: Response) => {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }
  try {
    const meters = simulatorEngine.getAllLatestReadings();
    const incidents = simulatorEngine.getIncidents();
    const plantSummary = simulatorEngine.getPlantSummary();
    const reply = await askEnergyCopilot(query, { meters, incidents, plantSummary });
    res.json({ reply });
  } catch (err: any) {
    res.status(500).json({ error: 'AI Copilot failed', details: err.message });
  }
});

export default app;
