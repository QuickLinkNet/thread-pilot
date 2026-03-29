import type { HTMLAttributes } from 'react';
import type { TaskPriority } from '../../types/api';
import { TASK_PRIORITY_LABELS } from '../../lib/task-priority';
import { cx } from '../../lib/classnames';

interface PriorityBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  priority: TaskPriority;
  withPrefix?: boolean;
}

export function PriorityBadge({
  priority,
  withPrefix = true,
  className,
  ...props
}: PriorityBadgeProps) {
  return (
    <span className={cx('task-priority-chip', `task-priority-${priority}`, className)} {...props}>
      {withPrefix ? `Priority: ${TASK_PRIORITY_LABELS[priority]}` : TASK_PRIORITY_LABELS[priority]}
    </span>
  );
}

