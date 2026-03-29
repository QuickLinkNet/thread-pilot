import type { HTMLAttributes } from 'react';
import type { TaskStatus } from '../../types/api';
import { cx } from '../../lib/classnames';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status: TaskStatus;
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  blocked: 'Blocked',
  ready_for_review: 'Ready For Review',
  done: 'Done',
};

export function StatusBadge({ status, className, ...props }: BadgeProps) {
  return (
    <span className={cx('status-badge', `status-${status}`, className)} {...props}>
      {STATUS_LABELS[status]}
    </span>
  );
}
