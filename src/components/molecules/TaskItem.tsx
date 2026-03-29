import { useEffect, useState } from 'react';
import type { Task, TaskStatus } from '../../types/api';
import type { TaskRouteSuggestion } from '../../types/api';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { SelectField } from '../atoms/FormFields';
import { TaskItemHeader } from './task-item/TaskItemHeader';
import { TaskItemMeta } from './task-item/TaskItemMeta';

interface TaskItemProps {
  task: Task;
  density?: 'comfort' | 'compact';
  highlighted?: boolean;
  routing: TaskRouteSuggestion;
  onOpenDetails: (task: Task) => void;
  onApplyRouting: () => void;
  onEdit: (task: Task) => void;
  onHistory: (task: Task) => void;
  onDelete: (taskId: number) => void;
  onRestore: (taskId: number) => void;
  onRequestReview: (taskId: number) => void;
  onStatusChange: (taskId: number, newStatus: TaskStatus) => void;
}

export function TaskItem({
  task,
  density = 'comfort',
  highlighted = false,
  routing,
  onOpenDetails,
  onApplyRouting,
  onEdit,
  onHistory,
  onDelete,
  onRestore,
  onRequestReview,
  onStatusChange
}: TaskItemProps) {
  const [expanded, setExpanded] = useState(density === 'comfort');
  const isDeleted = Boolean(task.deleted_at);
  const isCompact = density === 'compact';
  const showDetails = !isCompact || expanded;

  useEffect(() => {
    if (!isCompact) {
      setExpanded(true);
    }
  }, [isCompact]);

  return (
    <Card className={`task-item task-item-${density} ${highlighted ? 'task-item-highlight' : ''}`} data-task-id={task.id}>
      <TaskItemHeader
        task={task}
        isDeleted={isDeleted}
        isCompact={isCompact}
        showDetails={showDetails}
        onOpenDetails={onOpenDetails}
        onEdit={onEdit}
        onHistory={onHistory}
        onDelete={onDelete}
        onRestore={onRestore}
        onRequestReview={onRequestReview}
        onToggleExpanded={() => setExpanded((prev) => !prev)}
      />

      {showDetails && <p className="task-item-description">{task.description}</p>}

      {showDetails && <TaskItemMeta task={task} />}

      {showDetails && (
        <div className={`task-routing task-routing-${routing.kind}`}>
          <div className="task-routing-text">
            <strong>Routing:</strong> {routing.message}
          </div>
          {routing.kind === 'ready' && routing.suggested_assignee && (
            <Button size="sm" variant="ghost" onClick={onApplyRouting}>
              Apply Route
            </Button>
          )}
        </div>
      )}

      {showDetails && (
        <div className="task-item-footer">
          <SelectField
            id={`status-${task.id}`}
            label="Status"
            value={task.status}
            disabled={isDeleted}
            onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}
          >
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="blocked">Blocked</option>
            <option value="ready_for_review">Ready For Review</option>
            <option value="done">Done</option>
          </SelectField>
          <time dateTime={task.updated_at}>
            Updated: {new Date(task.updated_at).toLocaleString()}
          </time>
        </div>
      )}
    </Card>
  );
}
