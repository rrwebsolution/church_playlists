const DEFAULT_STATE = {
  text: '',
  fontSize: 60,
  background: 'none',
  fontFamily: 'Roboto, sans-serif',
  videoUrl: '',
  uploadedVideoKey: null,
  bold: true,
  allCaps: true,
  updatedAt: 0,
  clientId: '',
  clientSequence: 0,
};

const HEARTBEAT_INTERVAL_MS = 15000;

const createObsStateService = () => {
  let state = { ...DEFAULT_STATE };
  const clients = new Set();

  const writeSseEvent = (res, event, payload) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  const broadcastState = () => {
    for (const client of clients) {
      writeSseEvent(client, 'obs-state', state);
    }
  };

  const withCors = (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cache-Control, Last-Event-ID');
  };

  const handleStateRequest = (req, res) => {
    withCors(res);
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method === 'GET') {
      res.end(JSON.stringify(state));
      return;
    }

    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          const incoming = JSON.parse(body || '{}');
          const incomingClientId = incoming.clientId || '';
          const incomingSequence = Number(incoming.clientSequence || 0);
          const currentSequence = Number(state.clientSequence || 0);

          if (
            incomingClientId &&
            incomingClientId === state.clientId &&
            incomingSequence > 0 &&
            currentSequence > 0 &&
            incomingSequence < currentSequence
          ) {
            res.end(JSON.stringify({ ok: true, ignored: true, updatedAt: state.updatedAt }));
            return;
          }

          state = {
            ...state,
            ...incoming,
            updatedAt: incoming.updatedAt ?? Date.now(),
          };
          broadcastState();
          res.end(JSON.stringify({ ok: true, updatedAt: state.updatedAt }));
        } catch {
          res.statusCode = 400;
          res.end(JSON.stringify({ ok: false, message: 'Invalid JSON payload.' }));
        }
      });
      return;
    }

    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, message: 'Method not allowed.' }));
  };

  const handleStreamRequest = (req, res) => {
    withCors(res);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    res.flushHeaders?.();
    res.write('retry: 2000\n\n');
    writeSseEvent(res, 'obs-state', state);

    const heartbeat = setInterval(() => {
      res.write(`: keep-alive ${Date.now()}\n\n`);
    }, HEARTBEAT_INTERVAL_MS);

    clients.add(res);

    req.on('close', () => {
      clearInterval(heartbeat);
      clients.delete(res);
      res.end();
    });
  };

  return {
    handleStateRequest,
    handleStreamRequest,
  };
};

export { createObsStateService };
