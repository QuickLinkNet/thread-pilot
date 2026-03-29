import type { Task } from '../types/api';

export type SortMode = 'updated_desc' | 'updated_asc' | 'id_desc' | 'id_asc' | 'title_asc';
export type GroupKey = 'needs_attention' | 'in_progress' | 'open' | 'done' | 'other';

export interface TaskGroup {
  key: GroupKey;
  label: string;
  tasks: Task[];
}

export function normalizeAssignee(value: string): string {
  const lower = value.trim().toLowerCase();
  if (lower === '' || lower === 'none' || lower === 'unassigned') return 'unassigned';
  return lower;
}

export function parseTags(tags: string): string[] {
  return tags.split(',').map((tag) => tag.trim()).filter(Boolean);
}

export function isUpdatedToday(task: Task): boolean {
  const today = new Date();
  const updated = new Date(task.updated_at);
  return (
    updated.getFullYear() === today.getFullYear() &&
    updated.getMonth() === today.getMonth() &&
    updated.getDate() === today.getDate()
  );
}

export function sortTasks(tasks: Task[], mode: SortMode): Task[] {
  const cloned = [...tasks];
  if (mode === 'updated_desc') return cloned.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  if (mode === 'updated_asc') return cloned.sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
  if (mode === 'id_desc') return cloned.sort((a, b) => b.id - a.id);
  if (mode === 'id_asc') return cloned.sort((a, b) => a.id - b.id);
  return cloned.sort((a, b) => a.title.localeCompare(b.title, 'de'));
}

export function groupTasks(tasks: Task[]): TaskGroup[] {
  const map: Record<GroupKey, Task[]> = {
    needs_attention: [],
    in_progress: [],
    open: [],
    done: [],
    other: [],
  };

  for (const task of tasks) {
    if (task.deleted_at) continue;
    if (task.status === 'blocked' || task.status === 'ready_for_review') {
      map.needs_attention.push(task);
      continue;
    }
    if (task.status === 'in_progress') {
      map.in_progress.push(task);
      continue;
    }
    if (task.status === 'open') {
      map.open.push(task);
      continue;
    }
    if (task.status === 'done') {
      map.done.push(task);
      continue;
    }
    map.other.push(task);
  }

  const groups: TaskGroup[] = [
    { key: 'needs_attention', label: 'Needs attention', tasks: map.needs_attention },
    { key: 'in_progress', label: 'In progress', tasks: map.in_progress },
    { key: 'open', label: 'Open', tasks: map.open },
    { key: 'done', label: 'Done', tasks: map.done },
    { key: 'other', label: 'Other', tasks: map.other },
  ];

  return groups.filter((group) => group.tasks.length > 0);
}
