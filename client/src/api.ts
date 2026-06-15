import type {
  CreatePollRequest,
  CreatePollResponse,
  Poll,
  PollListItem,
  VoteRequest,
} from './types';

const API_BASE = '/api';

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `请求失败 (${res.status})`);
  }
  return data as T;
}

export function getFingerprintHeader() {
  const fp = localStorage.getItem('voter_fingerprint');
  return fp ? { 'X-Voter-Fingerprint': fp } : {};
}

export const api = {
  createPoll: (body: CreatePollRequest) =>
    request<CreatePollResponse>('/polls', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getPoll: (id: string) =>
    request<Poll>(`/polls/${id}`, {
      headers: getFingerprintHeader(),
    }),

  submitVote: (id: string, body: VoteRequest) =>
    request<Poll>(`/polls/${id}/vote`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getResults: (id: string) =>
    request<Poll>(`/polls/${id}/results`, {
      headers: getFingerprintHeader(),
    }),

  listPolls: (creatorToken: string) =>
    request<PollListItem[]>(`/polls?creator_token=${encodeURIComponent(creatorToken)}`),
};
