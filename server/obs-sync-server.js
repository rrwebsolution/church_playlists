import express from 'express';
import cors from 'cors';
import { createObsStateService } from './obs-state-service.js';

const app = express();
const port = Number(process.env.OBS_SYNC_PORT || process.env.PORT || 3030);
const obsStateService = createObsStateService();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/obs-state', obsStateService.handleStateRequest);
app.post('/api/obs-state', obsStateService.handleStateRequest);
app.options('/api/obs-state', obsStateService.handleStateRequest);
app.get('/api/obs-state/stream', obsStateService.handleStreamRequest);

app.listen(port, '0.0.0.0', () => {
  console.log(`OBS sync server listening on http://0.0.0.0:${port}`);
});
