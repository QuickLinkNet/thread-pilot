import type { Message } from '../../types/api';
import { Card } from '../atoms/Card';
import { MessageItem } from './MessageItem';

interface MessageGroupProps {
  messages: Message[];
  compactMode?: boolean;
  focusedMessageId?: number | null;
  activityLabel?: string;
}

export function MessageGroup({
  messages,
  compactMode = false,
  focusedMessageId = null,
  activityLabel,
}: MessageGroupProps) {
  if (messages.length === 0) {
    return null;
  }

  return (
    <Card className="message-group message-group-card">
      {messages.map((message, index) => (
        <MessageItem
          key={message.id}
          message={message}
          highlighted={focusedMessageId === message.id}
          compactMode={compactMode}
          showHeader={index === 0}
          grouped={true}
          activityLabel={activityLabel}
        />
      ))}
    </Card>
  );
}
