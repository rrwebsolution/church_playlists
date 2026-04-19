import type { IncomingMessage, ServerResponse } from 'node:http';

export interface ObsStateService {
  handleStateRequest: (req: IncomingMessage, res: ServerResponse) => void;
  handleStreamRequest: (req: IncomingMessage, res: ServerResponse) => void;
}

export function createObsStateService(): ObsStateService;
