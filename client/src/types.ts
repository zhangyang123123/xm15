export type PollType = 'single' | 'multiple';

export interface PollOption {
  id: string;
  poll_id: string;
  label: string;
  emoji: string | null;
  sort_order: number;
  votes: number;
}

export interface Poll {
  id: string;
  title: string;
  description: string | null;
  poll_type: PollType;
  max_choices: number;
  expires_at: string | null;
  created_at: string;
  options: PollOption[];
  total_votes: number;
  has_voted: boolean;
  is_expired: boolean;
}

export interface PollListItem {
  id: string;
  title: string;
  description: string | null;
  poll_type: PollType;
  max_choices: number;
  expires_at: string | null;
  created_at: string;
  total_votes: number;
  is_expired: boolean;
}

export interface CreatePollRequest {
  title: string;
  description?: string;
  poll_type: PollType;
  max_choices?: number;
  expires_at?: string | null;
  options: Array<{ label: string; emoji?: string }>;
}

export interface CreatePollResponse {
  poll_id: string;
  creator_token: string;
}

export interface VoteRequest {
  option_ids: string[];
  fingerprint: string;
}
