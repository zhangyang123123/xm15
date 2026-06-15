import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { PollListItem } from '../types';
import { getCreatorTokens, formatDate } from '../utils';

export default function MyPollsPage() {
  const navigate = useNavigate();
  const [polls, setPolls] = useState<PollListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadPolls = async () => {
      const tokens = getCreatorTokens();
      if (tokens.length === 0) {
        setLoading(false);
        return;
      }
      try {
        const allPolls: PollListItem[] = [];
        for (const token of tokens) {
          try {
            const list = await api.listPolls(token);
            allPolls.push(...list);
          } catch {}
        }
        const seen = new Set<string>();
        const unique = allPolls.filter((p) => {
          if (seen.has(p.id)) return false;
          seen.add(p.id);
          return true;
        });
        unique.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setPolls(unique);
      } catch (err: any) {
        setError(err.message || '加载失败');
      } finally {
        setLoading(false);
      }
    };
    loadPolls();
  }, []);

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  return (
    <div className="card">
      <h1>我的投票</h1>

      {error && <div className="error-box">{error}</div>}

      {polls.length === 0 ? (
        <div className="empty-state">
          <p style={{ fontSize: 48, marginBottom: 12 }}>📊</p>
          <p>你还没有创建过投票</p>
          <button className="btn-primary" onClick={() => navigate('/')}>
            创建第一个投票
          </button>
        </div>
      ) : (
        <>
          <p style={{ color: '#888', marginBottom: 16 }}>共 {polls.length} 个投票</p>
          {polls.map((poll) => (
            <div
              key={poll.id}
              className="poll-list-item"
              onClick={() => navigate(`/poll/${poll.id}/results`)}
            >
              <div className="poll-list-info">
                <h3>{poll.title}</h3>
                {poll.description && (
                  <p style={{ color: '#555', marginBottom: 8 }}>
                    {poll.description.length > 60
                      ? poll.description.slice(0, 60) + '...'
                      : poll.description}
                  </p>
                )}
                <p>
                  {poll.poll_type === 'single' ? '单选' : `多选（最多${poll.max_choices}项）`}
                  {' · '}
                  创建于 {formatDate(poll.created_at)}
                </p>
                {poll.expires_at && <p>截止：{formatDate(poll.expires_at)}</p>}
              </div>
              <div className="poll-list-stats">
                <div className="count">{poll.total_votes}</div>
                <div className="label">票</div>
                <span
                  className={`status-badge ${poll.is_expired ? 'ended' : 'active'}`}
                  style={{ marginTop: 8 }}
                >
                  {poll.is_expired ? '已结束' : '进行中'}
                </span>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
