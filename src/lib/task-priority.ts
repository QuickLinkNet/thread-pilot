import type { TaskPriority } from '../types/api';

export const TASK_PRIORITY_VALUES: TaskPriority[] = ['low', 'normal', 'high', 'urgent'];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};

