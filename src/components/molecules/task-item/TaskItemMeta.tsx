import type { Task } from '../../../types/api';

interface TaskItemMetaProps {
  task: Task;
}

export function TaskItemMeta({ task }: TaskItemMetaProps) {
  const tagList = (task.tags || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  return (
    <div className="task-item-meta">
      <span>Tags: {tagList.length > 0 ? tagList.join(', ') : 'none'}</span>
      <span>Lock: {task.locked_by ? task.locked_by : 'none'}</span>
      <span>
        Depends on: {(task.depends_on && task.depends_on.length > 0)
          ? task.depends_on.map((id) => `#${id}`).join(', ')
          : 'none'}
      </span>
    </div>
  );
}

