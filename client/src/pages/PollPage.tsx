import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { Poll } from '../types';
import { getFingerprint, formatDate } from '../utils';

export default function PollPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const loadPoll = useCallback(async () => {
    if (!id) return;
    try {
      const data = await api.getPoll(id);
      setPoll(data);
    } catch (err: any) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPoll();
  }, [loadPoll]);

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
          loadPoll();
        }
      } catch {}
    };

    ws.onerror = () => {};

    return () => {
      ws.close();
    };
  }, [id, loadPoll]);

  const handleOptionClick = (optionId: string) => {
    if (!poll || poll.has_voted || poll.is_expired) return;

    if (poll.poll_type === 'single') {
      submitVote([optionId]);
    } else {
      setSelectedOptions((prev) => {
        if (prev.includes(optionId)) {
          return prev.filter((o) => o !== optionId);
        }
        if (prev.length >= poll.max_choices) {
          return prev;
        }
        return [...prev, optionId];
      });
    }
  };

  const submitVote = async (optionIds: string[]) => {
    if (!poll) return;
    setSubmitting(true);
    setError('');
    try {
      const fingerprint = await getFingerprint();
      const updated = await api.submitVote(poll.id, {
        option_ids: optionIds,
        fingerprint,
      });
      setPoll(updated);
    } catch (err: any) {
      setError(err.message || '投票失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitMultiple = () => {
    if (selectedOptions.length === 0) {
      setError('请至少选择一个选项');
      return;
    }
    submitVote(selectedOptions);
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (error && !poll) {
    return (
      <div className="card">
        <div className="error-box">{error}</div>
        <button className="btn-secondary" onClick={() => navigate('/')}>
          返回首页
        </button>
      </div>
    );
  }

  if (!poll) {
    return null;
  }

  const showResults = poll.has_voted || poll.is_expired;

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <h1 style={{ marginBottom: 0 }}>{poll.title}</h1>
        {poll.is_expired && <span className="expired-badge">已结束</span>}
      </div>

      {poll.description && <p className="poll-description">{poll.description}</p>}

      <div className="meta-info">
        <p>
          {poll.poll_type === 'single' ? '单选' : `多选（最多选 ${poll.max_choices} 项）`}
          {' · '}
          总票数：{poll.total_votes}
        </p>
        <p>创建时间：{formatDate(poll.created_at)}</p>
        {poll.expires_at && <p>截止时间：{formatDate(poll.expires_at)}</p>}
      </div>

      {error && <div className="error-box">{error}</div>}

      {poll.has_voted && !poll.is_expired && (
        <div className="success-box" style={{ marginBottom: 16 }}>
          您已成功投票，下面是实时统计结果 👇
        </div>
      )}

      {poll.is_expired && !poll.has_voted && (
        <div className="error-box">投票已结束，感谢参与！</div>
      )}

      {poll.options.map((option) => {
        const percentage = poll.total_votes > 0
          ? Math.round((option.votes / poll.total_votes) * 100)
          : 0;
        const isSelected = selectedOptions.includes(option.id);
        const disabled = poll.has_voted || poll.is_expired || submitting;

        return (
          <div
            key={option.id}
            className={`poll-option ${isSelected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`}
            onClick={() => !disabled && handleOptionClick(option.id)}
          >
            {showResults && (
              <div className="progress-bar" style={{ width: `${percentage}%` }} />
            )}
            <div className="poll-option-header">
              <div className="poll-option-label">
                {poll.poll_type === 'multiple' && !showResults && (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleOptionClick(option.id)}
                    onClick={(e) => e.stopPropagation()}
                    disabled={disabled}
                  />
                )}
                {option.emoji && <span className="poll-option-emoji">{option.emoji}</span>}
                <span>{option.label}</span>
              </div>
              {showResults && (
                <div className="poll-option-votes">
                  {option.votes} 票 ({percentage}%)
                </div>
              )}
            </div>
          </div>
        );
      })}

      {poll.poll_type === 'multiple' && !showResults && (
        <div style={{ marginTop: 16 }}>
          <div className="help-text" style={{ marginBottom: 12 }}>
            已选 {selectedOptions.length} / {poll.max_choices}
          </div>
          <button
            className="btn-primary"
            style={{ width: '100%' }}
            onClick={handleSubmitMultiple}
            disabled={submitting || selectedOptions.length === 0}
          >
            {submitting ? '提交中...' : '提交投票'}
          </button>
        </div>
      )}

      {showResults && (
        <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
          <button
            className="btn-secondary"
            style={{ flex: 1 }}
            onClick={() => navigate(`/poll/${poll.id}/results`)}
          >
            查看详细统计
          </button>
          <button className="btn-primary" style={{ flex: 1 }} onClick={() => navigate('/')}>
            创建我的投票
          </button>
        </div>
      )}
    </div>
  );
}
