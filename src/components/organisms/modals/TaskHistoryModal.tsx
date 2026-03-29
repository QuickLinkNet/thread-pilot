import { useEffect, useState } from 'react';
import type { Task, TaskEvent } from '../../../types/api';
import { apiClient } from '../../../lib/api-client';
import { Card } from '../../atoms/Card';
import { Button } from '../../atoms/Button';
import { AlertBox } from '../../molecules/AlertBox';

interface TaskHistoryModalProps {
  isOpen: boolean;
  task: Task | null;
  onClose: () => void;
}

export function TaskHistoryModal({ isOpen, task, onClose }: TaskHistoryModalProps) {
  const [events, setEvents] = useState<TaskEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!isOpen || !task) {
        return;
      }

      setLoading(true);
      setError(null);
      const response = await apiClient.getTaskHistory(task.id);
      if (response.ok && response.data) {
        setEvents(response.data);
      } else {
        setError(response.error || 'Could not load task history');
      }
      setLoading(false);
    };

    fetchHistory();
  }, [isOpen, task]);

  if (!isOpen || !task) {
    return null;
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Task history">
      <Card className="modal-card history-modal-card" elevated>
        <h3>Task History: {task.title}</h3>

        {error && <AlertBox>{error}</AlertBox>}

        <div className="history-feed">
          {loading ? (
            <Card className="empty-state">Loading history...</Card>
          ) : events.length === 0 ? (
            <Card className="empty-state">No history entries yet.</Card>
          ) : (
            events.map((event) => (
              <Card key={event.id} className="history-item">
                <div className="history-head">
                  <strong>{event.event_type}</strong>
                  <span>{new Date(event.created_at).toLocaleString()}</span>
                </div>
                <div className="history-meta">Actor: {event.actor}</div>
                <pre className="history-payload">
                  {JSON.stringify(event.event_payload, null, 2)}
                </pre>
              </Card>
            ))
          )}
        </div>

        <div className="modal-actions">
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
}
