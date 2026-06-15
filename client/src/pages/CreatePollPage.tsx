import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../api';
import type { PollType, CreatePollRequest } from '../types';
import { saveCreatorToken } from '../utils';

interface PollOptionInput {
  label: string;
  emoji: string;
}

const EMOJI_OPTIONS = [
  '👍',
  '❤️',
  '🎉',
  '🔥',
  '⭐',
  '✅',
  '🎯',
  '🚀',
  '💡',
  '🏆',
  '🍕',
  '🎮',
  '📚',
  '🎵',
  '🌈',
  '',
];

export default function CreatePollPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pollType, setPollType] = useState<PollType>('single');
  const [maxChoices, setMaxChoices] = useState(2);
  const [expiresAt, setExpiresAt] = useState('');
  const [enableExpiry, setEnableExpiry] = useState(false);
  const [options, setOptions] = useState<PollOptionInput[]>([
    { label: '', emoji: '' },
    { label: '', emoji: '' },
  ]);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState<{ pollId: string; creatorToken: string } | null>(null);

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, { label: '', emoji: '' }]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, field: keyof PollOptionInput, value: string) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validOptions = options
      .map((o) => ({
        label: o.label.trim(),
        emoji: o.emoji || undefined,
      }))
      .filter((o) => o.label);

    if (!title.trim()) {
      setError('请输入投票标题');
      return;
    }
    if (validOptions.length < 2) {
      setError('至少需要 2 个有效选项');
      return;
    }

    const payload: CreatePollRequest = {
      title: title.trim(),
      description: description.trim() || undefined,
      poll_type: pollType,
      options: validOptions,
    };

    if (pollType === 'multiple') {
      payload.max_choices = Math.min(maxChoices, validOptions.length);
    }

    if (enableExpiry && expiresAt) {
      payload.expires_at = new Date(expiresAt).toISOString();
    }

    try {
      const res = await api.createPoll(payload);
      saveCreatorToken(res.creator_token);
      setSubmitted({ pollId: res.poll_id, creatorToken: res.creator_token });
    } catch (err: any) {
      setError(err.message || '创建失败');
    }
  };

  const pollUrl = submitted
    ? `${window.location.origin}/poll/${submitted.pollId}`
    : '';

  const copyLink = () => {
    if (pollUrl) {
      navigator.clipboard.writeText(pollUrl).catch(() => {});
    }
  };

  if (submitted) {
    return (
      <div className="card">
        <div className="success-box">
          <h2 style={{ marginBottom: 8 }}>✅ 投票创建成功！</h2>
          <p style={{ color: '#2e7d32' }}>快分享下面的链接给朋友们来投票吧</p>
        </div>

        <div className="share-section">
          <div className="qr-wrapper">
            <QRCodeSVG value={pollUrl} size={200} level="H" />
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
          <div style={{ display: 'flex', gap: 10, width: '100%' }}>
            <button
              className="btn-primary"
              style={{ flex: 1 }}
              onClick={() => navigate(`/poll/${submitted.pollId}`)}
            >
              查看投票
            </button>
            <button
              className="btn-secondary"
              style={{ flex: 1 }}
              onClick={() => navigate(`/poll/${submitted.pollId}/results`)}
            >
              查看结果
            </button>
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <button
            className="btn-secondary"
            onClick={() => {
              setSubmitted(null);
              setTitle('');
              setDescription('');
              setOptions([
                { label: '', emoji: '' },
                { label: '', emoji: '' },
              ]);
              setExpiresAt('');
              setEnableExpiry(false);
            }}
          >
            再创建一个
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h1>创建投票</h1>

      {error && <div className="error-box">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>投票标题 *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="请输入投票标题"
            maxLength={100}
          />
        </div>

        <div className="form-group">
          <label>投票描述</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="可选：简单描述一下这个投票"
            maxLength={500}
          />
        </div>

        <div className="form-group">
          <label>投票类型</label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="pollType"
                checked={pollType === 'single'}
                onChange={() => setPollType('single')}
              />
              单选
            </label>
            <label>
              <input
                type="radio"
                name="pollType"
                checked={pollType === 'multiple'}
                onChange={() => setPollType('multiple')}
              />
              多选
            </label>
          </div>
          {pollType === 'multiple' && (
            <div style={{ marginTop: 12 }}>
              <label>最多可选几项</label>
              <input
                type="number"
                min={1}
                max={options.length}
                value={maxChoices}
                onChange={(e) =>
                  setMaxChoices(Math.max(1, Math.min(options.length, parseInt(e.target.value) || 1)))
                }
              />
              <div className="help-text">最多可选 {options.length} 项</div>
            </div>
          )}
        </div>

        <div className="form-group">
          <label>截止时间（可选）</label>
          <div className="radio-group" style={{ marginBottom: 8 }}>
            <label>
              <input
                type="radio"
                checked={!enableExpiry}
                onChange={() => setEnableExpiry(false)}
              />
              不限制
            </label>
            <label>
              <input
                type="radio"
                checked={enableExpiry}
                onChange={() => setEnableExpiry(true)}
              />
              设置截止时间
            </label>
          </div>
          {enableExpiry && (
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          )}
        </div>

        <div className="form-group">
          <label>
            投票选项 * （{options.length}/10，至少 2 个）
          </label>
          {options.map((opt, idx) => (
            <div key={idx} className="option-row">
              <input
                type="text"
                className="emoji-input"
                value={opt.emoji}
                onChange={(e) => updateOption(idx, 'emoji', e.target.value.slice(0, 2))}
                placeholder="😀"
              />
              <input
                type="text"
                value={opt.label}
                onChange={(e) => updateOption(idx, 'label', e.target.value)}
                placeholder={`选项 ${idx + 1}`}
                maxLength={100}
              />
              <button
                type="button"
                className="btn-danger"
                onClick={() => removeOption(idx)}
                disabled={options.length <= 2}
              >
                删除
              </button>
            </div>
          ))}

          <div style={{ marginTop: 8 }}>
            <div className="help-text" style={{ marginBottom: 6 }}>
              快速选择 emoji：
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji || 'clear'}
                  type="button"
                  className="btn-secondary btn-sm"
                  style={{ padding: '4px 10px', fontSize: 18 }}
                  onClick={() => {
                    const lastEmpty = options.findIndex((o) => !o.label);
                    const target = lastEmpty === -1 ? options.length - 1 : lastEmpty;
                    updateOption(target, 'emoji', emoji);
                  }}
                >
                  {emoji || '清除'}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="btn-secondary btn-sm"
            style={{ marginTop: 12 }}
            onClick={addOption}
            disabled={options.length >= 10}
          >
            + 添加选项
          </button>
        </div>

        <button type="submit" className="btn-primary" style={{ width: '100%' }}>
          创建投票
        </button>
      </form>
    </div>
  );
}
