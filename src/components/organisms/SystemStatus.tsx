import { useEffect, useMemo, useState } from 'react';
import type {
  DbRowsResponse,
  DbSchemaColumn,
  DbTableInfo,
  SystemHealth,
  SystemStats,
} from '../../types/api';
import { apiClient } from '../../lib/api-client';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { Spinner } from '../atoms/Spinner';
import { AlertBox } from '../molecules/AlertBox';
import { SectionHeader } from '../molecules/SectionHeader';

const DB_PAGE_SIZE = 50;

function renderCellValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function SystemStatus() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tables, setTables] = useState<DbTableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [schema, setSchema] = useState<DbSchemaColumn[]>([]);
  const [rows, setRows] = useState<DbRowsResponse | null>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [rowOffset, setRowOffset] = useState(0);

  const loadCore = async () => {
    setLoading(true);
    setError(null);

    const [healthRes, statsRes] = await Promise.all([apiClient.getHealth(), apiClient.getStats()]);

    if (!healthRes.ok) {
      setError(healthRes.error || 'Health check failed');
      setLoading(false);
      return;
    }

    if (!statsRes.ok) {
      setError(statsRes.error || 'Stats fetch failed');
      setLoading(false);
      return;
    }

    setHealth(healthRes.data || null);
    setStats(statsRes.data || null);
    setLoading(false);
  };

  const loadTables = async () => {
    setDbLoading(true);
    setDbError(null);

    const res = await apiClient.getDbTables();
    if (!res.ok || !res.data) {
      setDbError(res.error || 'Could not load DB tables');
      setDbLoading(false);
      return;
    }

    setTables(res.data);
    if (res.data.length > 0 && !selectedTable) {
      setSelectedTable(res.data[0].name);
    }
    setDbLoading(false);
  };

  const loadTableDetails = async (table: string, offset: number) => {
    if (!table) return;

    setDbLoading(true);
    setDbError(null);

    const [schemaRes, rowsRes] = await Promise.all([
      apiClient.getDbSchema(table),
      apiClient.getDbRows(table, DB_PAGE_SIZE, offset),
    ]);

    if (!schemaRes.ok || !schemaRes.data) {
      setDbError(schemaRes.error || 'Could not load table schema');
      setDbLoading(false);
      return;
    }

    if (!rowsRes.ok || !rowsRes.data) {
      setDbError(rowsRes.error || 'Could not load table rows');
      setDbLoading(false);
      return;
    }

    setSchema(schemaRes.data.columns || []);
    setRows(rowsRes.data);
    setDbLoading(false);
  };

  const loadAll = async () => {
    await Promise.all([loadCore(), loadTables()]);
  };

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    if (!selectedTable) return;
    void loadTableDetails(selectedTable, rowOffset);
  }, [selectedTable, rowOffset]);

  const pageInfo = useMemo(() => {
    if (!rows) return '0-0 / 0';
    const start = rows.total === 0 ? 0 : rows.offset + 1;
    const end = Math.min(rows.offset + rows.limit, rows.total);
    return `${start}-${end} / ${rows.total}`;
  }, [rows]);

  const canPrev = rowOffset > 0;
  const canNext = !!rows && rowOffset + DB_PAGE_SIZE < rows.total;

  if (loading) {
    return (
      <div className="content-state">
        <Spinner label="Loading system status..." />
      </div>
    );
  }

  return (
    <section className="content-panel system-panel">
      <SectionHeader
        title="System"
        subtitle="API health, metrics and read-only database viewer"
        action={
          <div className="system-actions">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                void loadAll();
                if (selectedTable) {
                  void loadTableDetails(selectedTable, rowOffset);
                }
              }}
            >
              Refresh
            </Button>
          </div>
        }
      />

      <div className="system-body">
        {error && <AlertBox>{error}</AlertBox>}

        <div className="system-feed">
          {health && (
            <Card className="system-grid-card">
              <div className="system-grid">
                <div><span>Service</span><strong>{health.service}</strong></div>
                <div><span>Status</span><strong>{health.status}</strong></div>
                <div><span>Database</span><strong>{health.database}</strong></div>
                <div><span>Time</span><strong>{new Date(health.time).toLocaleString()}</strong></div>
              </div>
            </Card>
          )}

          {stats && (
            <>
              <Card className="system-grid-card">
                <div className="system-grid">
                  <div><span>Requested by</span><strong>{stats.requested_by}</strong></div>
                  <div><span>Personas</span><strong>{stats.personas_total}</strong></div>
                  <div><span>Messages total</span><strong>{stats.messages_total}</strong></div>
                  <div><span>Messages 24h</span><strong>{stats.messages_last_24h}</strong></div>
                  <div><span>Tasks active</span><strong>{stats.tasks_active_total}</strong></div>
                  <div><span>Tasks deleted</span><strong>{stats.tasks_deleted_total}</strong></div>
                  <div><span>Tasks locked</span><strong>{stats.tasks_locked_total ?? 0}</strong></div>
                  <div><span>Tasks unassigned</span><strong>{stats.tasks_unassigned_total}</strong></div>
                  <div><span>Stats time</span><strong>{new Date(stats.time).toLocaleString()}</strong></div>
                </div>
              </Card>

              <Card className="system-grid-card">
                <h3 className="system-subhead">Tasks by Status</h3>
                <div className="system-grid">
                  {Object.entries(stats.tasks_by_status).map(([status, count]) => (
                    <div key={status}>
                      <span>{status}</span>
                      <strong>{count}</strong>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}

          <Card className="system-grid-card db-viewer-card">
            <div className="db-viewer-header">
              <h3 className="system-subhead">SQLite Viewer (read-only)</h3>
              <div className="db-viewer-controls">
                <select
                  className="field-control"
                  value={selectedTable}
                  onChange={(e) => {
                    setSelectedTable(e.target.value);
                    setRowOffset(0);
                  }}
                >
                  {tables.length === 0 ? (
                    <option value="">No tables</option>
                  ) : (
                    tables.map((table) => (
                      <option key={table.name} value={table.name}>
                        {table.name} ({table.row_count})
                      </option>
                    ))
                  )}
                </select>
                <Button size="sm" variant="ghost" onClick={() => void loadTables()}>
                  Reload tables
                </Button>
              </div>
            </div>

            {dbError && <AlertBox>{dbError}</AlertBox>}
            {dbLoading && <Spinner label="Loading DB view..." />}

            {!dbLoading && selectedTable && (
              <>
                <div className="db-schema-list">
                  {schema.map((col) => (
                    <span key={col.name} className="db-schema-chip">
                      {col.name} : {col.type || 'TEXT'}
                      {col.pk ? ' [PK]' : ''}
                      {col.notnull ? ' [NOT NULL]' : ''}
                    </span>
                  ))}
                </div>

                <div className="db-rows-toolbar">
                  <span className="db-rows-info">Rows {pageInfo}</span>
                  <div className="db-rows-actions">
                    <Button size="sm" variant="ghost" disabled={!canPrev} onClick={() => setRowOffset((v) => Math.max(0, v - DB_PAGE_SIZE))}>
                      Prev
                    </Button>
                    <Button size="sm" variant="ghost" disabled={!canNext} onClick={() => setRowOffset((v) => v + DB_PAGE_SIZE)}>
                      Next
                    </Button>
                  </div>
                </div>

                <div className="db-table-wrap">
                  <table className="db-table">
                    <thead>
                      <tr>
                        {(rows?.columns || []).map((col) => (
                          <th key={col}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(rows?.rows || []).length === 0 ? (
                        <tr>
                          <td colSpan={Math.max(1, rows?.columns?.length || 1)}>No rows</td>
                        </tr>
                      ) : (
                        (rows?.rows || []).map((row, idx) => (
                          <tr key={`${rows?.offset || 0}-${idx}`}>
                            {(rows?.columns || []).map((col) => (
                              <td key={col}>{renderCellValue(row[col])}</td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>
        </div>
      </div>
    </section>
  );
}
