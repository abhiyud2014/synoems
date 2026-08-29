import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.get('/api/test', (_req, res) => { res.json({ hello: 'world' }); });
export default app;
