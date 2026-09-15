import type { AppState, ParsedResult } from './types';

async function send<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'content-type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const getState = () => send<AppState>('/api/state');

export const setPlayers = (names: [string, string]) =>
  send<AppState>('/api/players', { method: 'POST', body: JSON.stringify({ names }) });

export const logResults = (slot: 1 | 2, date: string, entries: ParsedResult[]) =>
  send<AppState>('/api/log', { method: 'POST', body: JSON.stringify({ slot, date, entries }) });

export const deleteResult = (id: number) =>
  send<AppState>(`/api/log?id=${id}`, { method: 'DELETE' });
