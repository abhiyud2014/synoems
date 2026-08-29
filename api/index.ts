import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

let _sim: any = null;
async function getSim() {
  if (!_sim) {
    const mod = await import('./backend/kiotSimulator');
    _sim = mod.simulatorEngine;
  }
  return _sim;
}

let _gem: any = null;
async function getGem() {
  if (!_gem) {
    const mod = await import('./backend/geminiService');
    _gem = mod;
  }
  return _gem;
}

const METERS = [
  { device_id: 'e46347828fce', device_name: 'MAIN_PANEL_001', location: 'Substation-A Main 415V Incomer', feeder_type: 'MAIN_INCOMER', rated_capacity_kva: 100 },
  { device_id: 'e46347828fcf', device_name: 'HVAC_CHILLER_PLANT', location: 'Utility Yard - Chiller #2 & Cooling Towers', feeder_type: 'HVAC_CHILLER', rated_capacity_kva: 45 },
  { device_id: 'e46347828fd0', device_name: 'COMPRESSOR_HOUSE_B', location: 'Utility Block - Atlas Copco Screw Comp 150HP', feeder_type: 'COMPRESSOR', rated_capacity_kva: 35 },
  { device_id: 'e46347828fd1', device_name: 'PRODUCTION_LINE_01', location: 'Assembly Hall - Robotics & VFD Conveyor Banks', feeder_type: 'PRODUCTION_LINE', rated_capacity_kva: 50 },
  { device_id: 'e46347828fd2', device_name: 'SOLAR_SUBSTATION_04', location: 'Roof Grid-Tie Solar PV 40kW Inverter Array', feeder_type: 'SOLAR_PV', rated_capacity_kva: 40 },
  { device_id: 'e46347828fd3', device_name: 'ARC_FURNACE_ZONE_C', location: 'Foundry Bay - 750kW Induction Melting Furnace', feeder_type: 'FURNACE', rated_capacity_kva: 80 },
];

app.get('/health', (_req, res) => { res.json({ status: 'ok', timestamp: new Date().toISOString() }); });

app.get(['/api/meters/discover', '/api/meters'], async (_req, res) => {
  const sim = await getSim();
  const meters = sim.getDiscoveredMeters();
  res.json(meters.map((m: any) => ({ device_id: m.device_id, device_name: m.device_name, location: m.location, feeder_type: m.feeder_type, rated_capacity_kva: m.rated_capacity_kva })));
});

app.get('/api/meters/:device_id/latest', async (req, res) => {
  const { device_id } = req.params;
  if (!device_id) return res.status(400).json({ error: 'Invalid Device ID' });
  const sim = await getSim();
  const reading = sim.getLatestReading(device_id);
  if (!reading) return res.status(404).json({ error: 'Device not Found' });
  res.json(reading);
});

app.get('/api/meters-all/latest', async (_req, res) => {
  const sim = await getSim();
  res.json(sim.getAllLatestReadings());
});

app.get('/api/meters/:device_id/history', async (req, res) => {
  const { device_id } = req.params;
  const range = (req.query.range as string) || '24h';
  const meter = METERS.find((m) => m.device_id === device_id);
  if (!meter) return res.status(404).json({ error: 'Device not Found' });
  const sim = await getSim();
  res.json({ device_id, device_name: meter.device_name, range, data: sim.getHistory(device_id, range) });
});

app.get('/api/plant/summary', async (_req, res) => {
  const sim = await getSim();
  res.json(sim.getPlantSummary());
});

app.get('/api/incidents', async (_req, res) => {
  const sim = await getSim();
  res.json(sim.getIncidents());
});

app.all('/api/incidents/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, author, note } = req.body;
  if (!status) return res.status(400).json({ error: 'Status is required' });
  const sim = await getSim();
  const updated = sim.updateIncidentStatus(id, status, author, note);
  if (!updated) return res.status(404).json({ error: 'Incident not found' });
  res.json({ success: true, incident: updated, ...updated });
});

app.all('/api/incidents/:id/diagnose', async (req, res) => {
  const { id } = req.params;
  const sim = await getSim();
  const incidents = sim.getIncidents();
  const incident = incidents.find((i: any) => i.id === id);
  if (!incident) return res.status(404).json({ error: 'Incident not found' });
  try {
    const gem = await getGem();
    const diagnosis = await gem.generateIncidentDiagnosis(incident.title, incident.category, incident.telemetrySnapshot);
    sim.updateIncidentDiagnosis(id, diagnosis);
    res.json({ success: true, diagnosis, incident: sim.getIncidents().find((i: any) => i.id === id) });
  } catch (err: any) {
    res.status(500).json({ error: 'Diagnosis failed', details: err.message });
  }
});

app.get(['/api/simulation/status', '/api/simulation/state'], async (_req, res) => {
  const sim = await getSim();
  res.json(sim.getSimulationState());
});

app.post(['/api/simulation/inject-fault', '/api/simulation/fault'], async (req, res) => {
  const device_id = req.body.device_id || req.body.deviceId;
  const fault_type = req.body.fault_type || req.body.faultType;
  if (!device_id || !fault_type) return res.status(400).json({ error: 'device_id and fault_type are required' });
  const sim = await getSim();
  sim.injectFault(device_id, fault_type);
  res.json({ success: true, message: `Fault ${fault_type} injected into ${device_id}` });
});

app.post(['/api/simulation/clear-faults', '/api/simulation/clear'], async (_req, res) => {
  const sim = await getSim();
  sim.clearAllFaults();
  res.json({ success: true, message: 'All simulation faults cleared' });
});

app.post(['/api/simulation/toggle-auto', '/api/simulation/auto'], async (req, res) => {
  const enabled = req.body.enabled !== undefined ? req.body.enabled : true;
  const sim = await getSim();
  sim.setAutoFaults(Boolean(enabled));
  res.json({ success: true, autoFaultsEnabled: Boolean(enabled) });
});

app.post('/api/ai/copilot', async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Query is required' });
  try {
    const sim = await getSim();
    const gem = await getGem();
    const reply = await gem.askEnergyCopilot(query, { meters: sim.getAllLatestReadings(), incidents: sim.getIncidents(), plantSummary: sim.getPlantSummary() });
    res.json({ reply });
  } catch (err: any) {
    res.status(500).json({ error: 'AI Copilot failed', details: err.message });
  }
});

export default app;
