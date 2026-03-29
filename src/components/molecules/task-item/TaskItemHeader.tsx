import type { Task } from '../../../types/api';
import { TaskItemActions } from './TaskItemActions';

interface TaskItemHeaderProps {
  task: Task;
  isDeleted: boolean;
  isCompact: boolean;
  showDetails: boolean;
  onOpenDetails: (task: Task) => void;
  onEdit: (task: Task) => void;
  onHistory: (task: Task) => void;
  onDelete: (taskId: number) => void;
  onRestore: (taskId: number) => void;
  onRequestReview: (taskId: number) => void;
  onToggleExpanded: () => void;
}

export function TaskItemHeader({
  task,
  isDeleted,
  isCompact,
  showDetails,
  onOpenDetails,
  onEdit,
  onHistory,
  onDelete,
  onRestore,
  onRequestReview,
  onToggleExpanded,
}: TaskItemHeaderProps) {
  return (
    <div className="task-item-head">
      <h3>
        <button type="button" className="task-id-pill task-id-pill-btn" onClick={() => onOpenDetails(task)}>
          #{task.id}
        </button>
        <button type="button" className="task-title-link" onClick={() => onOpenDetails(task)}>
          {task.title}
        </button>
      </h3>

      <TaskItemActions
        task={task}
        isDeleted={isDeleted}
        isCompact={isCompact}
        showDetails={showDetails}
        onEdit={onEdit}
        onHistory={onHistory}
        onDelete={onDelete}
        onRestore={onRestore}
        onRequestReview={onRequestReview}
        onToggleExpanded={onToggleExpanded}
      />
    </div>
  );
}

