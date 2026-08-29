import express from 'express';
import cors from 'cors';
import { simulatorEngine } from './backend/kiotSimulator';

const app = express();
app.use(cors());
app.get('/api/meters/discover', (_req, res) => {
  const meters = simulatorEngine.getDiscoveredMeters();
  res.json(meters.map((m: any) => ({ device_id: m.device_id, device_name: m.device_name })));
});
export default app;
