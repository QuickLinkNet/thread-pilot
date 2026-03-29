import { useMemo } from 'react';
import { formatActivityLabel, getDayLabel, toDayKey } from '../lib/chat-time';
import type { Message } from '../types/api';

interface MessageGroupData {
  sender: string;
  items: Message[];
}

type ChatFeedEntry =
  | { type: 'separator'; key: string; label: string }
  | { type: 'group'; key: string; group: MessageGroupData };

export function useChatPresentation(messages: Message[], searchQuery: string) {
  const visibleMessages = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return messages;
    }

    return messages.filter((message) => {
      const haystack = [
        message.sender,
        message.content,
        message.type ?? '',
        message.task_id ? `#${message.task_id}` : '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [messages, searchQuery]);

  const groupedMessages = useMemo<MessageGroupData[]>(() => {
    const groups: MessageGroupData[] = [];
    for (const message of visibleMessages) {
      const previousGroup = groups[groups.length - 1];
      if (previousGroup && previousGroup.sender === message.sender) {
        previousGroup.items.push(message);
      } else {
        groups.push({ sender: message.sender, items: [message] });
      }
    }
    return groups;
  }, [visibleMessages]);

  const groupedFeed = useMemo<ChatFeedEntry[]>(() => {
    const now = new Date();
    let lastDayKey: string | null = null;
    const feed: ChatFeedEntry[] = [];

    for (const group of groupedMessages) {
      const firstMessage = group.items[0];
      if (!firstMessage) continue;

      const messageDate = new Date(firstMessage.created_at);
      const dayKey = toDayKey(messageDate);
      if (dayKey !== lastDayKey) {
        feed.push({
          type: 'separator',
          key: `sep-${dayKey}`,
          label: getDayLabel(dayKey, now),
        });
        lastDayKey = dayKey;
      }

      feed.push({
        type: 'group',
        key: `group-${group.sender}-${firstMessage.id}`,
        group,
      });
    }

    return feed;
  }, [groupedMessages]);

  const activityBySender = useMemo(() => {
    const map: Record<string, string> = {};
    const latestBySender = new Map<string, string>();
    for (const message of visibleMessages) {
      const current = latestBySender.get(message.sender);
      if (!current || new Date(message.created_at).getTime() > new Date(current).getTime()) {
        latestBySender.set(message.sender, message.created_at);
      }
    }

    const now = new Date();
    for (const [sender, createdAt] of latestBySender) {
      map[sender] = formatActivityLabel(createdAt, now);
    }
    return map;
  }, [visibleMessages]);

  return {
    visibleMessages,
    groupedFeed,
    activityBySender,
  };
}

