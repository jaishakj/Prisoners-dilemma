import type {
  AlgorithmMeta,
  StartGameRequest,
  StartGameResponse,
  PlayRoundRequest,
  RoundResultResponse,
  GameSummaryResponse,
} from './types.js';

const BASE = '/api';

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) init.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, init);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error((err as { error: string }).error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  getAlgorithms(): Promise<AlgorithmMeta[]> {
    return request<AlgorithmMeta[]>('GET', '/algorithms');
  },

  startGame(payload: StartGameRequest): Promise<StartGameResponse> {
    return request<StartGameResponse>('POST', '/game/start', payload);
  },

  playRound(payload: PlayRoundRequest): Promise<RoundResultResponse> {
    return request<RoundResultResponse>('POST', '/game/round', payload);
  },

  getSummary(sessionId: string): Promise<GameSummaryResponse> {
    return request<GameSummaryResponse>('GET', `/game/${sessionId}/summary`);
  },

  deleteSession(sessionId: string): Promise<void> {
    return request<void>('DELETE', `/game/${sessionId}`);
  },
};
