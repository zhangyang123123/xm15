import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../api';
import type { Poll } from '../types';
import { formatDate } from '../utils';

export default function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const wsRef = useRef<WebSocket | null>(null);

  const loadResults = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.getResults(id);
      setPoll(data);
    } catch (err: any) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  useEffect(() => {
    if (!id) return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'poll_update' && data.poll_id === id) {
          loadResults();
        }
      } catch {}
    };

    ws.onerror = () => {};

    return () => {
      ws.close();
    };
  }, [id, loadResults]);

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (error || !poll) {
    return (
      <div className="card">
        <div className="error-box">{error || '加载失败'}</div>
        <button className="btn-secondary" onClick={() => navigate('/my-polls')}>
          返回列表
        </button>
      </div>
    );
  }

  const sortedOptions = [...poll.options].sort((a, b) => b.votes - a.votes);
  const winner = sortedOptions[0];
  const pollUrl = `${window.location.origin}/poll/${poll.id}`;

  const copyLink = () => {
    navigator.clipboard.writeText(pollUrl).catch(() => {});
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <h1 style={{ marginBottom: 0 }}>{poll.title}</h1>
        <span className={`status-badge ${poll.is_expired ? 'ended' : 'active'}`}>
          {poll.is_expired ? '已结束' : '进行中'}
        </span>
      </div>

      {poll.description && <p className="poll-description">{poll.description}</p>}

      <div className="meta-info">
        <p>
          {poll.poll_type === 'single' ? '单选' : `多选（最多选 ${poll.max_choices} 项）`}
        </p>
        <p>创建时间：{formatDate(poll.created_at)}</p>
        {poll.expires_at && <p>截止时间：{formatDate(poll.expires_at)}</p>}
      </div>

      <div className="result-summary">
        <div className="result-stat">
          <div className="value">{poll.total_votes}</div>
          <div className="name">总票数</div>
        </div>
        <div className="result-stat">
          <div className="value">{poll.options.length}</div>
          <div className="name">选项数</div>
        </div>
        <div className="result-stat">
          <div className="value" style={{ fontSize: 20, color: '#764ba2' }}>
            {winner.emoji} {winner.label}
          </div>
          <div className="name">当前领先</div>
        </div>
      </div>

      <h2>实时统计</h2>
      {poll.options.map((option, idx) => {
        const percentage = poll.total_votes > 0
          ? Math.round((option.votes / poll.total_votes) * 1000) / 10
          : 0;
        const sortedIdx = sortedOptions.findIndex((o) => o.id === option.id);

        return (
          <div key={option.id} className="poll-option disabled" style={{ cursor: 'default' }}>
            <div className="progress-bar" style={{ width: `${percentage}%` }} />
            <div className="poll-option-header">
              <div className="poll-option-label">
                <span style={{ color: '#888', minWidth: 24, fontWeight: 600 }}>
                  #{sortedIdx + 1}
                </span>
                {option.emoji && <span className="poll-option-emoji">{option.emoji}</span>}
                <span>{option.label}</span>
              </div>
              <div className="poll-option-votes">
                {option.votes} 票 ({percentage}%)
              </div>
            </div>
          </div>
        );
      })}

      {!poll.is_expired && (
        <div className="share-section" style={{ marginTop: 24 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>分享投票</div>
          <div className="qr-wrapper">
            <QRCodeSVG value={pollUrl} size={160} level="H" />
          </div>
          <div style={{ width: '100%' }}>
            <label>投票链接</label>
            <div className="share-url">
              <input type="text" value={pollUrl} readOnly />
              <button className="btn-primary btn-sm" onClick={copyLink}>
                复制
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
        <button className="btn-secondary" style={{ flex: 1 }} onClick={() => navigate('/my-polls')}>
          返回列表
        </button>
        <button className="btn-primary" style={{ flex: 1 }} onClick={() => navigate(`/poll/${poll.id}`)}>
          打开投票页
        </button>
      </div>
    </div>
  );
}
