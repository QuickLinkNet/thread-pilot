import { useState, useCallback, useRef } from 'react';
import { apiClient } from '../lib/api-client';
import { useAutoRefresh } from './useAutoRefresh';
import { loadMessageCache, mergeMessages, normalizeSyncPayload, persistMessageCache, extractLastMessageId } from '../lib/message-sync';
import type { Message, MessageType } from '../types/api';

export function useMessages(pollInterval: number = 15000) {
  const initialCacheRef = useRef(loadMessageCache());
  const initialCache = initialCacheRef.current;

  const [messages, setMessages] = useState<Message[]>(() => initialCache?.messages ?? []);
  const [loading, setLoading] = useState(() => !initialCache);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(() => (initialCache ? new Date() : null));

  const lastMessageIdRef = useRef(initialCache?.lastId ?? extractLastMessageId(initialCache?.messages ?? [], 0));

  const fetchMessages = useCallback(async (sinceId: number = 0, silent: boolean = false) => {
    if (!silent) {
      setSyncing(true);
    }

    const response = await apiClient.getMessagesSync(sinceId);

    if (response.ok && response.data) {
      const sync = normalizeSyncPayload(response.data, sinceId);
      setMessages((prev) => {
        const base = sinceId > 0 ? prev : [];
        const merged = mergeMessages(base, sync.items);
        const resolvedLastId = Math.max(sync.last_id, extractLastMessageId(merged, sinceId));
        lastMessageIdRef.current = resolvedLastId;
        persistMessageCache(merged, resolvedLastId);
        return merged;
      });

      setError(null);
      setLastRefreshAt(new Date());
    } else {
      setError(response.error || 'Failed to fetch messages');
    }

    setLoading(false);
    if (!silent) {
      setSyncing(false);
    }
  }, []);

  const sendMessage = useCallback(async (
    content: string,
    options?: { type?: MessageType; task_id?: number; mentions?: string[] }
  ) => {
    const response = await apiClient.sendStructuredMessage({
      content,
      ...options,
    });

    if (response.ok && response.data) {
      setMessages((prev) => {
        const merged = mergeMessages(prev, [response.data!]);
        const lastId = extractLastMessageId(merged, lastMessageIdRef.current);
        lastMessageIdRef.current = lastId;
        persistMessageCache(merged, lastId);
        return merged;
      });
      return true;
    }

    setError(response.error || 'Failed to send message');
    return false;
  }, []);

  const refreshNowInternal = useCallback(async () => {
    await fetchMessages(lastMessageIdRef.current || 0);
  }, [fetchMessages]);

  const { nextRefreshIn, triggerRefresh } = useAutoRefresh({
    intervalMs: pollInterval,
    enabled: true,
    immediate: true,
    refreshOnFocusVisible: true,
    onRefresh: refreshNowInternal,
  });

  const refreshNow = useCallback(async () => {
    await triggerRefresh();
  }, [triggerRefresh]);

  return {
    messages,
    loading,
    syncing,
    error,
    sendMessage,
    refreshNow,
    lastRefreshAt,
    nextRefreshIn,
  };
}
