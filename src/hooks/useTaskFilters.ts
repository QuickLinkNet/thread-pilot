import { useMemo, useState } from 'react';
import type { Task, TaskPriority, TaskStatus } from '../types/api';
import {
  groupTasks,
  isUpdatedToday,
  normalizeAssignee,
  parseTags,
  sortTasks,
  type SortMode,
} from '../lib/task-list-utils';

export function useTaskFilters(tasks: Task[]) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [sortMode, setSortMode] = useState<SortMode>('updated_desc');
  const [quickUnassignedOnly, setQuickUnassignedOnly] = useState(false);
  const [quickUpdatedTodayOnly, setQuickUpdatedTodayOnly] = useState(false);

  const assigneeOptions = useMemo(() => {
    const values = new Set<string>();
    for (const task of tasks) {
      if (task.deleted_at) continue;
      const assignee = task.assignee?.trim();
      if (!assignee) continue;
      values.add(assignee);
    }
    return ['all', ...Array.from(values).sort((a, b) => a.localeCompare(b, 'de'))];
  }, [tasks]);

  const tagOptions = useMemo(() => {
    const values = new Set<string>();
    for (const task of tasks) {
      if (task.deleted_at) continue;
      for (const tag of parseTags(task.tags || '')) {
        values.add(tag);
      }
    }
    return ['all', ...Array.from(values).sort((a, b) => a.localeCompare(b, 'de'))];
  }, [tasks]);

  const filteredSortedTasks = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filtered = tasks.filter((task) => {
      if (task.deleted_at) return false;
      if (statusFilter !== 'all' && task.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && (task.priority ?? 'normal') !== priorityFilter) return false;
      if (assigneeFilter !== 'all' && task.assignee !== assigneeFilter) return false;
      if (tagFilter !== 'all' && !parseTags(task.tags || '').includes(tagFilter)) return false;
      if (quickUnassignedOnly && normalizeAssignee(task.assignee || '') !== 'unassigned') return false;
      if (quickUpdatedTodayOnly && !isUpdatedToday(task)) return false;
      if (!normalizedSearch) return true;

      const haystack = [
        String(task.id),
        task.title,
        task.description,
        task.tags,
        task.assignee,
        task.status,
        task.priority,
        task.locked_by || '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });

    return sortTasks(filtered, sortMode);
  }, [
    tasks,
    searchTerm,
    statusFilter,
    priorityFilter,
    assigneeFilter,
    tagFilter,
    sortMode,
    quickUnassignedOnly,
    quickUpdatedTodayOnly,
  ]);

  const groupedTasks = useMemo(() => groupTasks(filteredSortedTasks), [filteredSortedTasks]);

  return {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    assigneeFilter,
    setAssigneeFilter,
    tagFilter,
    setTagFilter,
    sortMode,
    setSortMode,
    quickUnassignedOnly,
    setQuickUnassignedOnly,
    quickUpdatedTodayOnly,
    setQuickUpdatedTodayOnly,
    assigneeOptions,
    tagOptions,
    groupedTasks,
  };
}

