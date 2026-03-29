import type { Message, MessageSyncData } from '../types/api';

const MESSAGE_CACHE_KEY = 'thread_pilot_messages_cache_v1';

interface MessageCachePayload {
  messages: Message[];
  lastId: number;
  updatedAt: string;
}

export function extractLastMessageId(messages: Message[], fallback: number = 0): number {
  if (messages.length === 0) {
    return fallback;
  }
  const last = messages[messages.length - 1];
  return Number.isFinite(last?.id) ? last.id : fallback;
}

export function mergeMessages(base: Message[], incoming: Message[]): Message[] {
  if (incoming.length === 0) {
    return base;
  }

  const byId = new Map<number, Message>();
  for (const item of base) {
    byId.set(item.id, item);
  }
  for (const item of incoming) {
    byId.set(item.id, item);
  }

  return Array.from(byId.values()).sort((a, b) => a.id - b.id);
}

export function normalizeSyncPayload(
  payload: MessageSyncData | Message[] | Record<string, unknown> | null | undefined,
  sinceId: number,
): MessageSyncData {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      since_id: sinceId,
      last_id: extractLastMessageId(payload, sinceId),
      count: payload.length,
    };
  }

  if (!payload || typeof payload !== 'object') {
    return {
      items: [],
      since_id: sinceId,
      last_id: sinceId,
      count: 0,
    };
  }

  const itemsRaw = (payload as Record<string, unknown>).items;
  const items = Array.isArray(itemsRaw) ? (itemsRaw as Message[]) : [];
  const lastIdRaw = Number((payload as Record<string, unknown>).last_id ?? extractLastMessageId(items, sinceId));
  const countRaw = Number((payload as Record<string, unknown>).count ?? items.length);

  return {
    items,
    since_id: sinceId,
    last_id: Number.isFinite(lastIdRaw) ? lastIdRaw : extractLastMessageId(items, sinceId),
    count: Number.isFinite(countRaw) ? countRaw : items.length,
  };
}

export function loadMessageCache(): MessageCachePayload | null {
  try {
    const raw = localStorage.getItem(MESSAGE_CACHE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<MessageCachePayload>;
    if (!Array.isArray(parsed.messages)) {
      return null;
    }

    const messages = parsed.messages.filter((item) => typeof item?.id === 'number');
    const lastId = Number(parsed.lastId ?? extractLastMessageId(messages, 0));

    return {
      messages,
      lastId: Number.isFinite(lastId) ? lastId : extractLastMessageId(messages, 0),
      updatedAt: String(parsed.updatedAt ?? ''),
    };
  } catch {
    return null;
  }
}

export function persistMessageCache(messages: Message[], lastId: number): void {
  const payload: MessageCachePayload = {
    messages,
    lastId,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(MESSAGE_CACHE_KEY, JSON.stringify(payload));
}
