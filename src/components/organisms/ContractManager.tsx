import { useEffect, useMemo, useState } from 'react';
import { apiClient } from '../../lib/api-client';
import type { PersonaContract, PersonaContractHistoryItem } from '../../types/api';
import { AlertBox } from '../molecules/AlertBox';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { Spinner } from '../atoms/Spinner';
import { SectionHeader } from '../molecules/SectionHeader';
import { TextField } from '../atoms/FormFields';

function normalizeHistory(
  input: PersonaContractHistoryItem[] | Record<string, unknown> | null | undefined,
): PersonaContractHistoryItem[] {
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
      return value as PersonaContractHistoryItem[];
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

function historyLabel(item: PersonaContractHistoryItem): string {
  return `v${item.version} • ${item.created_by} • ${formatDate(item.created_at)}`;
}

export function ContractManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contract, setContract] = useState<PersonaContract | null>(null);
  const [history, setHistory] = useState<PersonaContractHistoryItem[]>([]);
  const [editorText, setEditorText] = useState('');
  const [changeNote, setChangeNote] = useState('');

  const hasChanges = useMemo(() => {
    return contract ? editorText !== contract.text : false;
  }, [contract, editorText]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [contractRes, historyRes] = await Promise.all([
        apiClient.getPersonaContract(),
        apiClient.getPersonaContractHistory(80),
      ]);

      if (!contractRes.ok || !contractRes.data) {
        setError(contractRes.error || 'Contract konnte nicht geladen werden');
        return;
      }

      if (!historyRes.ok || !historyRes.data) {
        setError(historyRes.error || 'Contract-History konnte nicht geladen werden');
        return;
      }

      setContract(contractRes.data);
      setEditorText(contractRes.data.text || '');
      setHistory(normalizeHistory(historyRes.data));
    } catch {
      setError('Contract konnte nicht geladen werden');
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
      setError('Contract-Text darf nicht leer sein');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await apiClient.savePersonaContract({
        text,
        change_note: changeNote.trim(),
      });

      if (!response.ok || !response.data) {
        setError(response.error || 'Contract konnte nicht gespeichert werden');
        return;
      }

      setContract(response.data);
      setEditorText(response.data.text || '');
      setChangeNote('');
      await load();
    } catch {
      setError('Contract konnte nicht gespeichert werden');
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async (item: PersonaContractHistoryItem) => {
    const ok = confirm(`Version ${item.version} als neue aktive Version wiederherstellen?`);
    if (!ok) {
      return;
    }

    setRestoringId(item.id);
    setError(null);

    try {
      const response = await apiClient.restorePersonaContract({
        version_id: item.id,
        change_note: `Restore von Version ${item.version}`,
      });

      if (!response.ok || !response.data) {
        setError(response.error || 'Version konnte nicht wiederhergestellt werden');
        return;
      }

      setContract(response.data);
      setEditorText(response.data.text || '');
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
        <Spinner label="Lade Persona Contract..." />
      </div>
    );
  }

  return (
    <section className="content-panel contract-panel">
      <SectionHeader
        title="Persona Contract"
        subtitle="Verbindliche Regeln fuer Personas bearbeiten, versionieren und nachvollziehen"
        action={
          <div className="contract-actions">
            <Button size="sm" variant="ghost" onClick={() => void load()} disabled={saving}>
              Refresh
            </Button>
            <Button size="sm" onClick={() => void handleSave()} disabled={saving || !hasChanges}>
              {saving ? 'Speichert...' : 'Speichern'}
            </Button>
          </div>
        }
      />

      {error && <AlertBox>{error}</AlertBox>}

      <div className="contract-grid">
        <Card className="contract-editor-card">
          <div className="contract-meta">
            <span>Aktiv: {contract ? `v${contract.version}` : '-'}</span>
            <span>Von: {contract?.created_by || '-'}</span>
            <span>Stand: {contract ? formatDate(contract.created_at) : '-'}</span>
          </div>

          <label htmlFor="contract-editor" className="field-label">Contract Text</label>
          <textarea
            id="contract-editor"
            className="field-control field-textarea contract-editor"
            value={editorText}
            onChange={(e) => setEditorText(e.target.value)}
            spellCheck={false}
          />

          <TextField
            id="contract-change-note"
            label="Aenderungsnotiz"
            value={changeNote}
            onChange={(e) => setChangeNote(e.target.value)}
            placeholder="Kurz beschreiben, was geaendert wurde"
          />
        </Card>

        <Card className="contract-history-card">
          <h3>History</h3>
          <p className="contract-history-subtitle">Aeltere Versionen einsehen und wiederherstellen</p>

          <div className="contract-history-list">
            {history.length === 0 ? (
              <div className="empty-state">Keine Versionen vorhanden.</div>
            ) : (
              history.map((item) => (
                <div key={item.id} className={`contract-history-item ${item.is_active === 1 ? 'contract-history-item-active' : ''}`}>
                  <div className="contract-history-head">
                    <strong>{historyLabel(item)}</strong>
                    {item.is_active === 1 && <span className="status-badge status-done">active</span>}
                  </div>
                  <p>{item.change_note || 'Ohne Notiz'}</p>
                  <code className="contract-history-preview">
                    {item.content_text.slice(0, 180)}
                    {item.content_text.length > 180 ? '...' : ''}
                  </code>
                  <div className="contract-history-actions">
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
