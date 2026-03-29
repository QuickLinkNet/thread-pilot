import type { Task } from '../../../types/api';
import { Button } from '../../atoms/Button';
import { StatusBadge } from '../../atoms/Badge';
import { PriorityBadge } from '../../atoms/PriorityBadge';

interface TaskItemActionsProps {
  task: Task;
  isDeleted: boolean;
  isCompact: boolean;
  showDetails: boolean;
  onEdit: (task: Task) => void;
  onHistory: (task: Task) => void;
  onDelete: (taskId: number) => void;
  onRestore: (taskId: number) => void;
  onRequestReview: (taskId: number) => void;
  onToggleExpanded: () => void;
}

export function TaskItemActions({
  task,
  isDeleted,
  isCompact,
  showDetails,
  onEdit,
  onHistory,
  onDelete,
  onRestore,
  onRequestReview,
  onToggleExpanded,
}: TaskItemActionsProps) {
  return (
    <div className="task-item-actions">
      <Button variant="ghost" size="sm" onClick={() => onEdit(task)} disabled={isDeleted}>
        Edit
      </Button>
      <Button variant="ghost" size="sm" onClick={() => onHistory(task)}>
        History
      </Button>
      {isDeleted ? (
        <Button variant="primary" size="sm" onClick={() => onRestore(task.id)}>
          Restore
        </Button>
      ) : (
        <>
          {task.status !== 'ready_for_review' && task.status !== 'done' && (
            <Button variant="primary" size="sm" onClick={() => onRequestReview(task.id)}>
              Review
            </Button>
          )}
          <Button variant="danger" size="sm" onClick={() => onDelete(task.id)}>
            Delete
          </Button>
        </>
      )}

      <span className="task-assignee-chip">Assignee: {task.assignee || 'Unassigned'}</span>
      <PriorityBadge priority={task.priority ?? 'normal'} />
      <StatusBadge status={task.status} />
      {task.locked_by && <span className="task-locked-note">Locked by {task.locked_by}</span>}
      {isDeleted && <span className="task-deleted-note">Deleted</span>}

      {isCompact && (
        <Button
          variant="ghost"
          size="sm"
          className="task-expand-btn"
          onClick={onToggleExpanded}
          aria-label={showDetails ? 'Details ausblenden' : 'Details anzeigen'}
        >
          {showDetails ? '^' : 'v'}
        </Button>
      )}
    </div>
  );
}

