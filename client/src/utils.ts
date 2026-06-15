import FingerprintJS from '@fingerprintjs/fingerprintjs';

let cachedFingerprint: string | null = null;

export async function getFingerprint(): Promise<string> {
  const stored = localStorage.getItem('voter_fingerprint');
  if (stored) {
    return stored;
  }
  if (cachedFingerprint) {
    return cachedFingerprint;
  }
  const fp = await FingerprintJS.load();
  const result = await fp.get();
  cachedFingerprint = result.visitorId;
  localStorage.setItem('voter_fingerprint', cachedFingerprint);
  return cachedFingerprint;
}

const CREATOR_TOKENS_KEY = 'creator_tokens';

export function saveCreatorToken(token: string) {
  const tokens = getCreatorTokens();
  if (!tokens.includes(token)) {
    tokens.unshift(token);
    localStorage.setItem(CREATOR_TOKENS_KEY, JSON.stringify(tokens));
  }
}

export function getCreatorTokens(): string[] {
  try {
    const raw = localStorage.getItem(CREATOR_TOKENS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
