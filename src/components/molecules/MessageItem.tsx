import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import type { Message } from '../../types/api';
import { Card } from '../atoms/Card';
import { TaskInlineReference } from './TaskInlineReference';

interface MessageItemProps {
  message: Message;
  highlighted?: boolean;
  compactMode?: boolean;
  showHeader?: boolean;
  grouped?: boolean;
  activityLabel?: string;
}

export function MessageItem({
  message,
  highlighted = false,
  compactMode = false,
  showHeader = true,
  grouped = false,
  activityLabel,
}: MessageItemProps) {
  const [expanded, setExpanded] = useState(false);
  const type = message.type ?? 'message';
  const mentionList = Array.isArray(message.mentions)
    ? message.mentions
    : typeof message.mentions === 'string'
      ? message.mentions
        .split(',')
        .map((value: string) => value.trim())
        .filter(Boolean)
      : [];
  const createdAt = new Date(message.created_at);
  const now = new Date();
  const isToday =
    createdAt.getFullYear() === now.getFullYear() &&
    createdAt.getMonth() === now.getMonth() &&
    createdAt.getDate() === now.getDate();

  const senderInitials = message.sender
    .trim()
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2);

  const senderKey = message.sender
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const accentVariants = ['#d33a42', '#bf343b', '#a92d33', '#8f2830', '#d14b52'];
  const senderAccent = accentVariants[senderKey % accentVariants.length];

  const dateLabel = isToday
    ? 'Heute'
    : new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(createdAt);

  const timeLabel = new Intl.DateTimeFormat('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(createdAt);

  useEffect(() => {
    if (!compactMode) {
      setExpanded(false);
    }
  }, [compactMode]);

  const isCollapsible = compactMode;
  const isCollapsed = isCollapsible && !expanded;
  const showTypeBadge = type !== 'message';
  const hasTaskReference = /(^|\s)#\d+\b/.test(message.content);

  const renderMessageContent = (content: string): ReactNode => {
    const parts = content.split(/(#\d+\b)/g);
    return parts.map((part, index) => {
      if (!part) {
        return null;
      }
      const match = /^#(\d+)$/.exec(part);
      if (match) {
        return <TaskInlineReference key={`${message.id}-task-ref-${index}`} taskId={Number(match[1])} />;
      }
      return <span key={`${message.id}-text-${index}`}>{part}</span>;
    });
  };

  return (
    <Card
      className={[
        'message-item',
        `message-type-${type}`,
        highlighted ? 'message-item-highlight' : '',
        hasTaskReference ? 'message-item-soft-highlight' : '',
        grouped ? 'message-item-grouped' : '',
        !showHeader ? 'message-item-continued' : '',
      ].join(' ')}
      data-message-id={message.id}
    >
      {showHeader ? (
        <div className="message-head">
          <div className="message-sender">
            <span
              className="sender-avatar"
              style={{ '--sender-accent': senderAccent } as CSSProperties}
            >
              {senderInitials || '?'}
            </span>
            <div className="sender-meta">
              <strong>
                {message.sender}
                <span className="sender-activity">
                  {' '}
                  • {activityLabel ?? (isToday ? 'Heute' : dateLabel)}
                </span>
              </strong>
              {showTypeBadge ? (
                <span className={`message-type-badge message-type-badge-${type}`}>{type}</span>
              ) : null}
            </div>
          </div>
          <time className="message-time" dateTime={message.created_at}>
            {timeLabel}
          </time>
        </div>
      ) : (
        <div className={`message-subhead ${showTypeBadge ? '' : 'message-subhead-no-badge'}`}>
          {showTypeBadge ? (
            <span className={`message-type-badge message-type-badge-${type}`}>{type}</span>
          ) : null}
          <time className="message-time" dateTime={message.created_at}>
            {timeLabel}
          </time>
        </div>
      )}
      <div
        className={`message-content-wrap ${isCollapsible ? 'is-compact' : ''} ${isCollapsed ? 'is-collapsed' : 'is-expanded'}`}
        onClick={() => {
          if (isCollapsible) {
            setExpanded((prev) => !prev);
          }
        }}
        role={isCollapsible ? 'button' : undefined}
        tabIndex={isCollapsible ? 0 : undefined}
        onKeyDown={(event) => {
          if (!isCollapsible) {
            return;
          }
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setExpanded((prev) => !prev);
          }
        }}
      >
        <p className={`message-content ${isCollapsed ? 'message-content-collapsed' : ''}`}>
          {renderMessageContent(message.content)}
        </p>
      </div>
      {(message.task_id || mentionList.length > 0) && (
        <div className="message-links">
          {message.task_id ? <span className="message-link-chip">Task #{message.task_id}</span> : null}
          {mentionList.length > 0 ? (
            <span className="message-link-chip">@{mentionList.join(', @')}</span>
          ) : null}
        </div>
      )}
    </Card>
  );
}
