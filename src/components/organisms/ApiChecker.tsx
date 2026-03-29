import { useMemo, useState } from 'react';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { SectionHeader } from '../molecules/SectionHeader';
import { getApiCheckerItems } from '../../lib/api-checker';

export function ApiChecker() {
  const [copiedId, setCopiedId] = useState<string>('');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Messages: true,
    Tasks: false,
    Events: false,
    Personas: false,
    System: false,
  });
  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
  const items = useMemo(() => getApiCheckerItems(apiBase), [apiBase]);
  const groupedItems = useMemo(() => {
    const order = ['Messages', 'Tasks', 'Events', 'Personas', 'System'] as const;
    const grouped = order.map((category) => ({
      category,
      items: items.filter((item) => item.category === category),
    }));
    return grouped.filter((group) => group.items.length > 0);
  }, [items]);

  const copyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(''), 1200);
    } catch {
      setCopiedId('');
    }
  };

  return (
    <section className="content-panel">
      <SectionHeader
        title="API Checker"
        subtitle="Tree view with grouped endpoints for quick copy/use"
      />

      <div className="checker-feed">
        {groupedItems.map((group) => (
          <details
            key={group.category}
            className="checker-group"
            open={openGroups[group.category]}
            onToggle={(event) => {
              const nextOpen = (event.currentTarget as HTMLDetailsElement).open;
              setOpenGroups((prev) => ({ ...prev, [group.category]: nextOpen }));
            }}
          >
            <summary className="checker-group-summary">
              <span className="checker-group-title">{group.category}</span>
              <span className="checker-group-count">{group.items.length}</span>
            </summary>

            <div className="checker-tree">
              {group.items.map((item) => (
                <Card key={item.id} className="checker-item checker-tree-node">
                  <div className="checker-item-head">
                    <strong>{item.name}</strong>
                    <span className={`checker-method checker-${item.method.toLowerCase()}`}>{item.method}</span>
                  </div>

                  <p className="checker-description">{item.description}</p>

                  <label className="checker-label">URL</label>
                  <code className="checker-code">{item.url}</code>

                  {item.body && (
                    <>
                      <label className="checker-label">Body (JSON)</label>
                      <code className="checker-code">{item.body}</code>
                    </>
                  )}

                  <div className="checker-actions">
                    <Button size="sm" onClick={() => copyText(item.id, item.body ? `${item.url}\n${item.body}` : item.url)}>
                      {copiedId === item.id ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
