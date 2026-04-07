import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../lib/api-client';
import type { FirstMessage, FirstMessageHistoryItem } from '../../types/api';
import { AlertBox } from '../molecules/AlertBox';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Spinner } from '../atoms/Spinner';
import { SectionHeader } from '../molecules/SectionHeader';

function normalizeHistory(
  input: FirstMessageHistoryItem[] | Record<string, unknown> | null | undefined,
): FirstMessageHistoryItem[] {
  if (Array.isArray(input)) {
    return input;
  }

  if (!input || typeof input !== 'object') {
    return [];
  }

  const candidates = ['items', 'history', 'versions', 'data'] as const;
  for (const key of candidates) {
    const value = (input as Record<string, unknown>)[key];
    if (Array.isArray(value)) {
      return value as FirstMessageHistoryItem[];
    }
  }

  return [];
}

function formatDate(value: string): string {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function historyLabel(item: FirstMessageHistoryItem): string {
  return `v${item.version} • ${item.created_by} • ${formatDate(item.created_at)}`;
}

function replaceTemplatePlaceholders(text: string): string {
  const apiUrl = import.meta.env.VITE_API_BASE_URL || '/api';
  const token = import.meta.env.VITE_API_TOKEN || '[TOKEN]';
  const persona = import.meta.env.VITE_API_PERSONA || '[PERSONA_NAME]';

  return text
    .replace(/\{\{API_URL\}\}/g, apiUrl)
    .replace(/\{\{TOKEN\}\}/g, token)
    .replace(/\{\{PERSONA_NAME\}\}/g, persona);
}

export function FirstMessageManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<FirstMessage | null>(null);
  const [history, setHistory] = useState<FirstMessageHistoryItem[]>([]);
  const [editorText, setEditorText] = useState('');
  const [changeNote, setChangeNote] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const hasChanges = useMemo(() => {
    return message ? editorText !== message.text : false;
  }, [message, editorText]);

  const previewText = useMemo(() => {
    return replaceTemplatePlaceholders(editorText);
  }, [editorText]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [messageRes, historyRes] = await Promise.all([
        apiClient.getFirstMessage(),
        apiClient.getFirstMessageHistory(80),
      ]);

      if (!messageRes.ok || !messageRes.data) {
        setError(messageRes.error || 'First Message konnte nicht geladen werden');
        return;
      }

      if (!historyRes.ok || !historyRes.data) {
        setError(historyRes.error || 'First Message History konnte nicht geladen werden');
        return;
      }

      setMessage(messageRes.data);
      setEditorText(messageRes.data.text || '');
      setHistory(normalizeHistory(historyRes.data));
    } catch {
      setError('First Message konnte nicht geladen werden');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleSave = async () => {
    const text = editorText.trim();
    if (text === '') {
      setError('First Message Text darf nicht leer sein');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await apiClient.saveFirstMessage({
        text,
        change_note: changeNote.trim(),
      });

      if (!res.ok || !res.data) {
        setError(res.error || 'First Message konnte nicht gespeichert werden');
        return;
      }

      setMessage(res.data);
      setEditorText(res.data.text);
      setChangeNote('');
      await load();
    } catch {
      setError('First Message konnte nicht gespeichert werden');
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async (item: FirstMessageHistoryItem) => {
    if (!window.confirm(`Version v${item.version} wiederherstellen?`)) {
      return;
    }

    setRestoringId(item.id);
    setError(null);

    try {
      const res = await apiClient.restoreFirstMessage({ id: item.id });

      if (!res.ok || !res.data) {
        setError(res.error || 'Version konnte nicht wiederhergestellt werden');
        return;
      }

      setMessage(res.data);
      setEditorText(res.data.text);
      setChangeNote('');
      await load();
    } catch {
      setError('Version konnte nicht wiederhergestellt werden');
    } finally {
      setRestoringId(null);
    }
  };

  if (loading) {
    return (
      <div className="content-state">
        <Spinner label="Lade First Message..." />
      </div>
    );
  }

  return (
    <section className="content-panel first-message-panel">
      <SectionHeader
        title="First Message"
        subtitle="System-Prompt fuer neue Personas verwalten und versionieren"
        action={
          <div className="first-message-actions">
            <Button size="sm" variant="ghost" onClick={() => void load()} disabled={saving}>
              Refresh
            </Button>
            <Button
              size="sm"
              variant={showPreview ? 'primary' : 'ghost'}
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? 'Editor' : 'Preview'}
            </Button>
            <Button size="sm" onClick={() => void handleSave()} disabled={saving || !hasChanges}>
              {saving ? 'Speichert...' : 'Speichern'}
            </Button>
          </div>
        }
      />

      {error && <AlertBox>{error}</AlertBox>}

      <div className="first-message-grid">
        <Card className="first-message-editor-card">
          <div className="first-message-meta">
            <span>Aktiv: {message ? `v${message.version}` : '-'}</span>
            <span>Von: {message?.created_by || '-'}</span>
            <span>Stand: {message ? formatDate(message.created_at) : '-'}</span>
          </div>

          {showPreview ? (
            <pre className="first-message-preview">{previewText}</pre>
          ) : (
            <textarea
              id="first-message-editor"
              className="field-control field-textarea first-message-editor"
              value={editorText}
              onChange={(e) => setEditorText(e.target.value)}
              spellCheck={false}
            />
          )}

          <div className="field">
            <input
              type="text"
              id="first-message-change-note"
              className="field-control"
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              placeholder="Aenderungsnotiz (optional)"
            />
          </div>
        </Card>

        <Card className="first-message-history-card">
          <div className="first-message-history-header">
            <h3>History</h3>
            <p className="first-message-history-subtitle">Aeltere Versionen einsehen und wiederherstellen</p>
          </div>

          <div className="first-message-history-list">
            {history.length === 0 ? (
              <div className="empty-state">Keine Versionen vorhanden.</div>
            ) : (
              history.map((item) => (
                <div key={item.id} className={`first-message-history-item ${item.is_active === 1 ? 'first-message-history-item-active' : ''}`}>
                  <div className="first-message-history-head">
                    <strong>{historyLabel(item)}</strong>
                    {item.is_active === 1 && <span className="status-badge status-done">active</span>}
                  </div>
                  <p>{item.change_note || 'Ohne Notiz'}</p>
                  <code className="first-message-history-preview">
                    {item.content_text.slice(0, 120)}
                    {item.content_text.length > 120 ? '...' : ''}
                  </code>
                  <div className="first-message-history-actions">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditorText(item.content_text)}
                      disabled={saving}
                    >
                      In Editor laden
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void handleRestore(item)}
                      disabled={saving || restoringId === item.id || item.is_active === 1}
                    >
                      {restoringId === item.id ? 'Stellt wieder her...' : 'Wiederherstellen'}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </section>
  );
}
