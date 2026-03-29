import { useCallback, useEffect, useRef, useState } from 'react';
import { useTasks } from '../../hooks/useTasks';
import { useTaskFilters } from '../../hooks/useTaskFilters';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';
import { apiClient } from '../../lib/api-client';
import { TaskModal } from './modals/TaskModal';
import { TaskHistoryModal } from './modals/TaskHistoryModal';
import { Spinner } from '../atoms/Spinner';
import { AlertBox } from '../molecules/AlertBox';
import { TaskFiltersPanel } from '../molecules/TaskFiltersPanel';
import { TaskItem } from '../molecules/TaskItem';
import { TaskToolbar } from '../molecules/TaskToolbar';
import type { Task, TaskPriority, TaskRouteSuggestion, TaskStatus } from '../../types/api';
import { type GroupKey } from '../../lib/task-list-utils';

const TASK_REFRESH_INTERVAL_SECONDS = 60;

export function TaskList() {
  const [showFilters, setShowFilters] = useState(false);
  const [openGroupKey, setOpenGroupKey] = useState<GroupKey>('needs_attention');
  const [syncingTasks, setSyncingTasks] = useState(false);
  const [lastTaskRefreshAt, setLastTaskRefreshAt] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [historyTask, setHistoryTask] = useState<Task | null>(null);
  const [focusedTaskId, setFocusedTaskId] = useState<number | null>(null);
  const [routeSuggestions, setRouteSuggestions] = useState<Record<number, TaskRouteSuggestion>>({});
  const [routeError, setRouteError] = useState<string | null>(null);
  const isRefreshingRef = useRef(false);

  const { tasks, loading, error, addTask, updateTask, updateTaskStatus, deleteTask, restoreTask, requestReviewTask, refetch } =
    useTasks(undefined, true);

  const {
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
  } = useTaskFilters(tasks);

  const loadRouteSuggestions = useCallback(async () => {
    const response = await apiClient.getTaskRouteSuggestions();
    if (!response.ok || !response.data || !Array.isArray(response.data)) {
      setRouteError(response.error || 'Could not load route suggestions');
      return;
    }

    const map: Record<number, TaskRouteSuggestion> = {};
    for (const entry of response.data) {
      map[entry.task_id] = entry.suggestion;
    }
    setRouteSuggestions(map);
    setRouteError(null);
  }, []);

  const refreshTasksNow = useCallback(async () => {
    if (isRefreshingRef.current) return;

    isRefreshingRef.current = true;
    setSyncingTasks(true);
    try {
      await refetch();
      setLastTaskRefreshAt(new Date());
    } finally {
      setSyncingTasks(false);
      isRefreshingRef.current = false;
    }
  }, [refetch]);

  const { nextRefreshIn: nextTaskRefreshIn, triggerRefresh: triggerTaskRefresh } = useAutoRefresh({
    intervalMs: TASK_REFRESH_INTERVAL_SECONDS * 1000,
    enabled: !loading,
    immediate: false,
    onRefresh: refreshTasksNow,
  });

  const handleStatusChange = async (taskId: number, newStatus: TaskStatus) => {
    await updateTaskStatus(taskId, newStatus);
  };

  const handleDelete = async (taskId: number) => {
    if (confirm('Are you sure you want to delete this task?')) {
      await deleteTask(taskId);
    }
  };

  const handleSaveTask = async (task: {
    title: string;
    description: string;
    tags: string;
    assignee: string;
    depends_on: number[];
    status: TaskStatus;
    priority: TaskPriority;
  }) => {
    const success = editingTask
      ? await updateTask(editingTask.id, { ...task, updated_at: editingTask.updated_at })
      : await addTask(task);

    if (success) {
      setIsModalOpen(false);
      setEditingTask(null);
    }
  };

  const applyRouting = async (task: Task) => {
    setRouteError(null);
    const response = await apiClient.applyTaskRoute(task.id, task.updated_at);
    if (!response.ok || !response.data) {
      setRouteError(response.error || 'Could not apply route');
      return;
    }

    await refetch();
    await loadRouteSuggestions();
  };

  useEffect(() => {
    if (groupedTasks.length === 0) return;
    const openStillExists = groupedTasks.some((group) => group.key === openGroupKey);
    if (!openStillExists) setOpenGroupKey(groupedTasks[0].key);
  }, [groupedTasks, openGroupKey]);

  useEffect(() => {
    const raw = localStorage.getItem('focus_task_id');
    if (!raw) return;

    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      localStorage.removeItem('focus_task_id');
      return;
    }

    setFocusedTaskId(parsed);
    localStorage.removeItem('focus_task_id');

    const timer = window.setTimeout(() => {
      const element = document.querySelector(`[data-task-id="${parsed}"]`);
      if (element instanceof HTMLElement) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 180);

    const clearTimer = window.setTimeout(() => setFocusedTaskId(null), 2600);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(clearTimer);
    };
  }, [tasks.length]);

  useEffect(() => {
    if (tasks.length === 0) {
      setRouteSuggestions({});
      return;
    }
    void loadRouteSuggestions();
  }, [tasks, loadRouteSuggestions]);

  useEffect(() => {
    if (loading || lastTaskRefreshAt) return;
    setLastTaskRefreshAt(new Date());
  }, [loading, lastTaskRefreshAt]);

  if (loading) {
    return (
      <div className="content-state">
        <Spinner label="Loading tasks..." />
      </div>
    );
  }

  return (
    <section className="content-panel task-panel">
      <TaskToolbar
        nextTaskRefreshIn={nextTaskRefreshIn}
        lastTaskRefreshAt={lastTaskRefreshAt}
        syncingTasks={syncingTasks}
        showFilters={showFilters}
        onRefresh={() => void triggerTaskRefresh()}
        onToggleFilters={() => setShowFilters((prev) => !prev)}
        onCreateTask={() => {
          setEditingTask(null);
          setIsModalOpen(true);
        }}
      />

      {showFilters && (
        <TaskFiltersPanel
          searchTerm={searchTerm}
          statusFilter={statusFilter}
          priorityFilter={priorityFilter}
          assigneeFilter={assigneeFilter}
          tagFilter={tagFilter}
          sortMode={sortMode}
          assigneeOptions={assigneeOptions}
          tagOptions={tagOptions}
          quickUnassignedOnly={quickUnassignedOnly}
          quickUpdatedTodayOnly={quickUpdatedTodayOnly}
          onSearchTermChange={setSearchTerm}
          onStatusFilterChange={setStatusFilter}
          onPriorityFilterChange={setPriorityFilter}
          onAssigneeFilterChange={setAssigneeFilter}
          onTagFilterChange={setTagFilter}
          onSortModeChange={setSortMode}
          onToggleQuickUnassigned={() => setQuickUnassignedOnly((prev) => !prev)}
          onToggleQuickUpdatedToday={() => setQuickUpdatedTodayOnly((prev) => !prev)}
        />
      )}

      <div className="task-feed">
        {(error || routeError) && <AlertBox>{routeError || error}</AlertBox>}

        {groupedTasks.length === 0 ? (
          <div className="empty-state">No tasks match your current filters.</div>
        ) : (
          groupedTasks.map((group) => (
            <section key={group.key} className={`task-group ${openGroupKey === group.key ? 'task-group-open' : ''}`}>
              <button type="button" className="task-group-header" onClick={() => setOpenGroupKey(group.key)}>
                <span>
                  {group.label} ({group.tasks.length})
                </span>
                <span>{openGroupKey === group.key ? '-' : '+'}</span>
              </button>

              {openGroupKey === group.key && (
                <div className="task-group-list">
                  {group.tasks.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      density="compact"
                      highlighted={focusedTaskId === task.id}
                      routing={routeSuggestions[task.id] || { kind: 'no_match', message: 'No suggestion loaded' }}
                      onOpenDetails={(nextTask) => {
                        setEditingTask(nextTask);
                        setIsModalOpen(true);
                      }}
                      onApplyRouting={() => applyRouting(task)}
                      onEdit={(nextTask) => {
                        setEditingTask(nextTask);
                        setIsModalOpen(true);
                      }}
                      onHistory={setHistoryTask}
                      onDelete={handleDelete}
                      onRestore={restoreTask}
                      onRequestReview={requestReviewTask}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </div>
              )}
            </section>
          ))
        )}
      </div>

      <TaskModal
        isOpen={isModalOpen}
        mode={editingTask ? 'edit' : 'create'}
        initialTask={editingTask}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleSaveTask}
      />

      <TaskHistoryModal isOpen={historyTask !== null} task={historyTask} onClose={() => setHistoryTask(null)} />
    </section>
  );
}
