import { Router, Request, Response } from 'express';
import { nanoid } from 'nanoid';
import { db } from './db';
import type {
  CreatePollRequest,
  CreatePollResponse,
  PollWithOptions,
  VoteRequest,
  PollListItem,
  PollType,
} from './types';
import type { WebSocketServer } from 'ws';

export const router = Router();

let wss: WebSocketServer | null = null;

export function setWebSocketServer(server: WebSocketServer) {
  wss = server;
}

function broadcastPollUpdate(pollId: string) {
  if (!wss) return;
  const message = JSON.stringify({ type: 'poll_update', poll_id: pollId });
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}

function isPollExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

function getPollWithOptions(pollId: string, fingerprint?: string): PollWithOptions | null {
  const poll = db.prepare('SELECT * FROM polls WHERE id = ?').get(pollId) as any;
  if (!poll) return null;

  const options = db
    .prepare(
      `SELECT o.*, 
        (SELECT COUNT(*) FROM votes v WHERE v.option_id = o.id) as votes
       FROM options o 
       WHERE o.poll_id = ? 
       ORDER BY o.sort_order ASC`
    )
    .all(pollId) as any[];

  const totalVotes = options.reduce((sum, o) => sum + o.votes, 0);
  const hasVoted = fingerprint
    ? (db.prepare('SELECT COUNT(*) as cnt FROM votes WHERE poll_id = ? AND voter_fingerprint = ?').get(pollId, fingerprint) as any).cnt > 0
    : false;

  return {
    ...poll,
    options,
    total_votes: totalVotes,
    has_voted: hasVoted,
    is_expired: isPollExpired(poll.expires_at),
  };
}

router.post('/polls', (req: Request, res: Response) => {
  try {
    const { title, description, poll_type, max_choices, expires_at, options } =
      req.body as CreatePollRequest;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: '投票标题不能为空' });
    }
    if (!options || options.length < 2) {
      return res.status(400).json({ error: '至少需要 2 个选项' });
    }
    if (options.length > 10) {
      return res.status(400).json({ error: '最多 10 个选项' });
    }
    if (!['single', 'multiple'].includes(poll_type)) {
      return res.status(400).json({ error: '无效的投票类型' });
    }
    if (poll_type === 'multiple') {
      const max = max_choices || options.length;
      if (max < 1 || max > options.length) {
        return res.status(400).json({ error: '最大可选数量无效' });
      }
    }

    const pollId = nanoid(10);
    const creatorToken = nanoid(32);

    const insertPoll = db.prepare(
      `INSERT INTO polls (id, title, description, poll_type, max_choices, expires_at, creator_token)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    const insertOption = db.prepare(
      `INSERT INTO options (id, poll_id, label, emoji, sort_order) VALUES (?, ?, ?, ?, ?)`
    );

    const tx = db.transaction(() => {
      insertPoll.run(
        pollId,
        title.trim(),
        description?.trim() || null,
        poll_type,
        poll_type === 'multiple' ? max_choices || options.length : 1,
        expires_at || null,
        creatorToken
      );
      options.forEach((opt: { label: string; emoji?: string }, idx: number) => {
        insertOption.run(nanoid(10), pollId, opt.label.trim(), opt.emoji || null, idx);
      });
    });
    tx();

    res.status(201).json({ poll_id: pollId, creator_token: creatorToken } as CreatePollResponse);
  } catch (err) {
    console.error('Create poll error:', err);
    res.status(500).json({ error: '创建投票失败' });
  }
});

router.get('/polls/:id', (req: Request, res: Response) => {
  const fingerprint = req.header('X-Voter-Fingerprint') || undefined;
  const poll = getPollWithOptions(req.params.id, fingerprint);
  if (!poll) {
    return res.status(404).json({ error: '投票不存在' });
  }
  const { creator_token, ...pollWithoutToken } = poll as any;
  res.json(pollWithoutToken);
});

router.post('/polls/:id/vote', (req: Request, res: Response) => {
  try {
    const pollId = req.params.id;
    const { option_ids, fingerprint } = req.body as VoteRequest;
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '';

    if (!fingerprint) {
      return res.status(400).json({ error: '缺少浏览器指纹' });
    }
    if (!option_ids || !Array.isArray(option_ids) || option_ids.length === 0) {
      return res.status(400).json({ error: '请选择投票选项' });
    }

    const poll = db.prepare('SELECT * FROM polls WHERE id = ?').get(pollId) as any;
    if (!poll) {
      return res.status(404).json({ error: '投票不存在' });
    }
    if (isPollExpired(poll.expires_at)) {
      return res.status(400).json({ error: '投票已结束' });
    }

    const existingVote = (db
      .prepare(
        'SELECT COUNT(*) as cnt FROM votes WHERE poll_id = ? AND (voter_fingerprint = ? OR voter_ip = ?)'
      )
      .get(pollId, fingerprint, ip) as any).cnt;
    if (existingVote > 0) {
      return res.status(400).json({ error: '您已经投过票了' });
    }

    const validOptions = db
      .prepare('SELECT id FROM options WHERE poll_id = ?')
      .all(pollId) as Array<{ id: string }>;
    const validOptionIds = new Set(validOptions.map((o) => o.id));

    for (const oid of option_ids) {
      if (!validOptionIds.has(oid)) {
        return res.status(400).json({ error: '无效的投票选项' });
      }
    }

    if (poll.poll_type === 'single' && option_ids.length !== 1) {
      return res.status(400).json({ error: '单选投票只能选一个选项' });
    }
    if (poll.poll_type === 'multiple' && option_ids.length > poll.max_choices) {
      return res.status(400).json({ error: `最多只能选 ${poll.max_choices} 项` });
    }

    const insertVote = db.prepare(
      'INSERT INTO votes (id, poll_id, option_id, voter_fingerprint, voter_ip) VALUES (?, ?, ?, ?, ?)'
    );

    const tx = db.transaction(() => {
      for (const oid of option_ids) {
        insertVote.run(nanoid(10), pollId, oid, fingerprint, ip);
      }
    });
    tx();

    broadcastPollUpdate(pollId);

    const updatedPoll = getPollWithOptions(pollId, fingerprint);
    const { creator_token, ...result } = (updatedPoll as any) || {};
    res.json(result);
  } catch (err) {
    console.error('Vote error:', err);
    res.status(500).json({ error: '投票失败' });
  }
});

router.get('/polls/:id/results', (req: Request, res: Response) => {
  const fingerprint = req.header('X-Voter-Fingerprint') || undefined;
  const poll = getPollWithOptions(req.params.id, fingerprint);
  if (!poll) {
    return res.status(404).json({ error: '投票不存在' });
  }
  const { creator_token, ...pollWithoutToken } = poll as any;
  res.json(pollWithoutToken);
});

router.get('/polls', (req: Request, res: Response) => {
  try {
    const creatorToken = req.query.creator_token as string;
    if (!creatorToken) {
      return res.status(400).json({ error: '缺少 creator_token 参数' });
    }

    const polls = db
      .prepare('SELECT * FROM polls WHERE creator_token = ? ORDER BY created_at DESC')
      .all(creatorToken) as any[];

    const result: PollListItem[] = polls.map((poll) => {
      const totalVotes = (db
        .prepare(
          `SELECT COUNT(*) as cnt FROM votes v 
           JOIN options o ON v.option_id = o.id 
           WHERE o.poll_id = ?`
        )
        .get(poll.id) as any).cnt as number;

      return {
        ...poll,
        total_votes: totalVotes,
        is_expired: isPollExpired(poll.expires_at),
      };
    });

    res.json(result);
  } catch (err) {
    console.error('List polls error:', err);
    res.status(500).json({ error: '获取投票列表失败' });
  }
});
