let state = { text: '', fontSize: 60, background: 'none', updatedAt: 0 };

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  if (req.method === 'GET') {
    res.status(200).json(state);
    return;
  }

  if (req.method === 'POST') {
    state = { ...state, ...req.body };
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).end();
}
