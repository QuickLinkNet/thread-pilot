import { useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '../../lib/api-client';
import type { GlobalEvent } from '../../types/api';
import { Button } from '../atoms/Button';
import { SelectField, TextField } from '../atoms/FormFields';
import { Spinner } from '../atoms/Spinner';
import { AlertBox } from '../molecules/AlertBox';
import { SectionHeader } from '../molecules/SectionHeader';

interface EventsStreamProps {
  onNavigate: (tab: 'chat' | 'tasks') => void;
}

function formatEventPayload(payload: Record<string, unknown>): string {
  const entries = Object.entries(payload).slice(0, 3);
  if (entries.length === 0) return 'No payload';

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return String(value);
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (Array.isArray(value)) {
      const normalized = value.slice(0, 4).map((item) => formatValue(item));
      return `[${normalized.join(', ')}${value.length > 4 ? ', ...' : ''}]`;
    }
    if (typeof value === 'object') {
      try {
        const json = JSON.stringify(value);
        if (!json) return '{}';
        return json.length > 180 ? `${json.slice(0, 177)}...` : json;
      } catch {
        return '{...}';
      }
    }
    return String(value);
  };

  return entries
    .map(([key, value]) => `${key}: ${formatValue(value)}`)
    .join(' | ');
}

export function EventsStream({ onNavigate }: EventsStreamProps) {
  const [events, setEvents] = useState<GlobalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [actorFilter, setActorFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');
  const [nextRefreshIn, setNextRefreshIn] = useState(5);
  const lastIdRef = useRef(0);
  const pollTimerRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const nextRefreshAtRef = useRef(Date.now() + 5000);

  const resetRefreshTimer = () => {
    nextRefreshAtRef.current = Date.now() + 5000;
    setNextRefreshIn(5);
  };

  const fetchEvents = async (sinceId?: number, silent: boolean = false) => {
    if (!silent) setSyncing(true);
    const response = await apiClient.getEvents(sinceId, 200);

    if (!response.ok || !response.data) {
      setError(response.error || 'Failed to fetch events');
      setLoading(false);
      if (!silent) setSyncing(false);
      return;
    }

    setError(null);
    if (sinceId && sinceId > 0) {
      setEvents((prev) => {
        const merged = [...prev, ...response.data!];
        const byId = new Map<number, GlobalEvent>();
        merged.forEach((event) => byId.set(event.id, event));
        return Array.from(byId.values()).sort((a, b) => b.id - a.id).slice(0, 300);
      });
    } else {
      const initial = [...response.data].sort((a, b) => b.id - a.id).slice(0, 300);
      setEvents(initial);
    }

    const maxId = response.data.reduce((max, event) => Math.max(max, event.id), lastIdRef.current);
    lastIdRef.current = maxId;
    setLoading(false);
    if (!silent) setSyncing(false);
  };

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      await fetchEvents(undefined, true);
      if (!isMounted) return;
      resetRefreshTimer();

      pollTimerRef.current = window.setInterval(async () => {
        await fetchEvents(lastIdRef.current || undefined, true);
        resetRefreshTimer();
      }, 5000);

      countdownTimerRef.current = window.setInterval(() => {
        const seconds = Math.max(0, Math.ceil((nextRefreshAtRef.current - Date.now()) / 1000));
        setNextRefreshIn(seconds);
      }, 1000);
    };

    run();

    return () => {
      isMounted = false;
      if (pollTimerRef.current) window.clearInterval(pollTimerRef.current);
      if (countdownTimerRef.current) window.clearInterval(countdownTimerRef.current);
    };
  }, []);

  const actorOptions = useMemo(() => {
    const set = new Set(events.map((event) => event.actor).filter(Boolean));
    return ['all', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [events]);

  const entityOptions = useMemo(() => {
    const set = new Set(events.map((event) => event.entity_type).filter(Boolean));
    return ['all', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesType = typeFilter.trim() === ''
        ? true
        : event.event_type.toLowerCase().includes(typeFilter.trim().toLowerCase());
      const matchesActor = actorFilter === 'all' ? true : event.actor === actorFilter;
      const matchesEntity = entityFilter === 'all' ? true : event.entity_type === entityFilter;
      return matchesType && matchesActor && matchesEntity;
    });
  }, [events, typeFilter, actorFilter, entityFilter]);

  const jumpToContext = (event: GlobalEvent) => {
    if (event.entity_type === 'task' && event.entity_id) {
      localStorage.setItem('focus_task_id', String(event.entity_id));
      onNavigate('tasks');
      return;
    }
    if (event.entity_type === 'message' && event.entity_id) {
      localStorage.setItem('focus_message_id', String(event.entity_id));
      onNavigate('chat');
    }
  };

  if (loading) {
    return (
      <div className="content-state">
        <Spinner label="Loading events..." />
      </div>
    );
  }

  return (
    <section className="content-panel events-panel">
      <SectionHeader
        title="Events"
        subtitle="Live event stream for system coordination"
        action={(
          <div className="events-header-tools">
            <span>Next sync in {nextRefreshIn}s</span>
            <Button size="sm" variant="ghost" onClick={() => fetchEvents(lastIdRef.current || undefined)} disabled={syncing}>
              {syncing ? 'Refreshing...' : 'Refresh now'}
            </Button>
          </div>
        )}
      />

      <div className="events-filters">
        <TextField
          id="events-type"
          label="Event type contains"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          placeholder="task_, message_, review..."
        />
        <SelectField
          id="events-actor"
          label="Actor"
          value={actorFilter}
          onChange={(e) => setActorFilter(e.target.value)}
        >
          {actorOptions.map((actor) => (
            <option key={actor} value={actor}>{actor}</option>
          ))}
        </SelectField>
        <SelectField
          id="events-entity"
          label="Entity"
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
        >
          {entityOptions.map((entity) => (
            <option key={entity} value={entity}>{entity}</option>
          ))}
        </SelectField>
      </div>

      <div className="events-feed">
        {error && <AlertBox>{error}</AlertBox>}

        {filteredEvents.length === 0 ? (
          <div className="empty-state">No events match current filters.</div>
        ) : (
          filteredEvents.map((event) => (
            <article key={event.id} className="events-item card">
              <div className="events-item-head">
                <div>
                  <span className="events-type">{event.event_type}</span>
                  <h3>#{event.id} {event.entity_type}{event.entity_id ? `:${event.entity_id}` : ''}</h3>
                </div>
                <time dateTime={event.created_at}>
                  {new Date(event.created_at).toLocaleString()}
                </time>
              </div>

              <p className="events-meta">Actor: {event.actor}</p>
              <p className="events-payload">{formatEventPayload(event.payload)}</p>

              {(event.entity_type === 'task' || event.entity_type === 'message') && event.entity_id ? (
                <div className="events-actions">
                  <Button size="sm" variant="ghost" onClick={() => jumpToContext(event)}>
                    Open Context
                  </Button>
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
