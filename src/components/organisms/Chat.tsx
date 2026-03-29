import { useEffect, useRef, useState } from 'react';
import { useMessages } from '../../hooks/useMessages';
import { useChatPresentation } from '../../hooks/useChatPresentation';
import { Button } from '../atoms/Button';
import { SelectField, TextField } from '../atoms/FormFields';
import { Spinner } from '../atoms/Spinner';
import { AlertBox } from '../molecules/AlertBox';
import { ChatDateSeparator } from '../molecules/ChatDateSeparator';
import { SectionHeader } from '../molecules/SectionHeader';
import { MessageGroup } from '../molecules/MessageGroup';
import { MESSAGE_TYPES, type MessageType } from '../../types/api';

export function Chat() {
  const {
    messages,
    loading,
    syncing,
    error,
    sendMessage,
    refreshNow,
    lastRefreshAt,
    nextRefreshIn,
  } = useMessages(15000);
  const [inputValue, setInputValue] = useState('');
  const [messageType, setMessageType] = useState<MessageType>('message');
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedMessageId, setFocusedMessageId] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const chatFeedRef = useRef<HTMLDivElement | null>(null);
  const hasInitialScrollDone = useRef(false);
  const isNearBottomRef = useRef(true);

  const { visibleMessages, groupedFeed, activityBySender } = useChatPresentation(messages, searchQuery);

  const updateNearBottomState = () => {
    const feed = chatFeedRef.current;
    if (!feed) return;

    const distanceToBottom = feed.scrollHeight - feed.scrollTop - feed.clientHeight;
    isNearBottomRef.current = distanceToBottom <= 100;
  };

  useEffect(() => {
    if (loading || visibleMessages.length === 0 || hasInitialScrollDone.current) {
      return;
    }

    const feed = chatFeedRef.current;
    if (!feed) return;

    feed.scrollTop = feed.scrollHeight;
    hasInitialScrollDone.current = true;
    isNearBottomRef.current = true;
  }, [loading, visibleMessages.length]);

  useEffect(() => {
    if (loading || visibleMessages.length === 0 || !hasInitialScrollDone.current || !isNearBottomRef.current) {
      return;
    }

    const feed = chatFeedRef.current;
    if (!feed) return;

    feed.scrollTop = feed.scrollHeight;
  }, [loading, visibleMessages.length]);

  useEffect(() => {
    const raw = localStorage.getItem('focus_message_id');
    if (!raw) return;

    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      localStorage.removeItem('focus_message_id');
      return;
    }

    setFocusedMessageId(parsed);
    localStorage.removeItem('focus_message_id');

    const timer = window.setTimeout(() => {
      const element = document.querySelector(`[data-message-id="${parsed}"]`);
      if (element instanceof HTMLElement) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 180);

    const clearTimer = window.setTimeout(() => setFocusedMessageId(null), 2400);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(clearTimer);
    };
  }, [messages.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim() || sending) return;

    setSending(true);
    const success = await sendMessage(inputValue.trim(), { type: messageType });
    if (success) {
      setInputValue('');
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="content-state">
        <Spinner label="Loading messages..." />
      </div>
    );
  }

  return (
    <section className="content-panel chat-panel">
      <SectionHeader
        className="chat-header-compact"
        action={
          <div className="chat-refresh-tools">
            <div className="chat-toolbar-search">
              <input
                type="text"
                className="field-control"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Suche in Messages oder #ID..."
                aria-label="Messages durchsuchen"
              />
            </div>
            <div className="chat-refresh-actions">
              <div className="chat-refresh-meta">
                <span>Next sync in {nextRefreshIn}s</span>
                <span>
                  Last sync: {lastRefreshAt ? lastRefreshAt.toLocaleTimeString() : 'not yet'}
                </span>
              </div>
              <Button
                size="sm"
                variant={compactMode ? 'danger' : 'ghost'}
                onClick={() => setCompactMode((prev) => !prev)}
                aria-pressed={compactMode}
              >
                {compactMode ? '[x] Compact Mode' : '[ ] Compact Mode'}
              </Button>
              <Button size="sm" variant="ghost" onClick={refreshNow} disabled={syncing}>
                {syncing ? 'Refreshing...' : 'Refresh now'}
              </Button>
            </div>
          </div>
        }
      />

      <div ref={chatFeedRef} className="chat-feed chat-feed-full" onScroll={updateNearBottomState}>
        {error && <AlertBox>{error}</AlertBox>}

        {groupedFeed.map((entry) => {
          if (entry.type === 'separator') {
            return <ChatDateSeparator key={entry.key} label={entry.label} />;
          }
          return (
            <MessageGroup
              key={entry.key}
              messages={entry.group.items}
              compactMode={compactMode}
              focusedMessageId={focusedMessageId}
              activityLabel={activityBySender[entry.group.sender] ?? 'offline'}
            />
          );
        })}
      </div>

      <div className="composer">
        <form onSubmit={handleSubmit} className="composer-form chat-composer-form">
          <SelectField
            id="message-type"
            label="Type"
            value={messageType}
            onChange={(e) => setMessageType(e.target.value as MessageType)}
            disabled={sending}
          >
            {MESSAGE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </SelectField>
          <TextField
            id="message-input"
            label="Message"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a message..."
            disabled={sending}
          />
          <Button type="submit" disabled={!inputValue.trim() || sending}>
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </form>
      </div>
    </section>
  );
}
