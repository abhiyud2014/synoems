import express from 'express';
import { simulatorEngine, METERS } from '../backend/kiotSimulator';

const app = express();
app.use(express.json());

app.get('/api/test', (_req, res) => { res.json({ ok: true }); });

app.get('/api/meters/discover', (_req, res) => {
  const meters = simulatorEngine.getDiscoveredMeters();
  res.json(meters.map((m: any) => ({ device_id: m.device_id, device_name: m.device_name, location: m.location })));
});

export default app;
