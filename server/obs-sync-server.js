import express from 'express';
import cors from 'cors';

const app = express();

app.use(cors());
app.use(express.json());

let state = { text: '', fontSize: 60, background: 'none', updatedAt: 0 };

app.get('/obs-state', (req, res) => {
  res.json(state);
});

app.post('/obs-state', (req, res) => {
  state = { ...state, ...req.body };
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`OBS sync server running on port ${PORT}`);
});
