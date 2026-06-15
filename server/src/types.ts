export type PollType = 'single' | 'multiple';

export interface Poll {
  id: string;
  title: string;
  description: string | null;
  poll_type: PollType;
  max_choices: number;
  expires_at: string | null;
  creator_token: string;
  created_at: string;
}

export interface Option {
  id: string;
  poll_id: string;
  label: string;
  emoji: string | null;
  sort_order: number;
}

export interface Vote {
  id: string;
  poll_id: string;
  option_id: string;
  voter_fingerprint: string;
  voter_ip: string;
  created_at: string;
}

export interface OptionWithVotes extends Option {
  votes: number;
}

export interface PollWithOptions extends Poll {
  options: OptionWithVotes[];
  total_votes: number;
  has_voted: boolean;
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

export interface PollListItem extends Poll {
  total_votes: number;
  is_expired: boolean;
}
