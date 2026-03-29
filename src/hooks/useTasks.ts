import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../lib/api-client';
import type { Task, TaskPriority, TaskStatus } from '../types/api';

export function useTasks(assignee?: string, includeDeleted: boolean = false) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    const response = await apiClient.getTasks(assignee, includeDeleted);

    if (response.ok && response.data) {
      setTasks(response.data);
      setError(null);
    } else {
      setError(response.error || 'Failed to fetch tasks');
    }

    setLoading(false);
  }, [assignee, includeDeleted]);

  const addTask = useCallback(async (task: {
    title: string;
    description: string;
    tags: string;
    assignee: string;
    depends_on?: number[];
    status?: TaskStatus;
    priority?: TaskPriority;
  }) => {
    const response = await apiClient.addTask(task);

    if (response.ok && response.data) {
      setTasks(prev => [response.data!, ...prev]);
      return true;
    } else {
      setError(response.error || 'Failed to add task');
      return false;
    }
  }, []);

  const updateTaskStatus = useCallback(async (taskId: number, status: TaskStatus) => {
    const currentTask = tasks.find((task) => task.id === taskId);
    if (!currentTask) {
      setError('Task not found in current state');
      return false;
    }

    const response = await apiClient.updateTask(taskId, {
      status,
      updated_at: currentTask.updated_at,
    });

    if (response.ok && response.data) {
      setTasks(prev =>
        prev.map(task => (task.id === taskId ? response.data! : task))
      );
      return true;
    } else {
      setError(response.error || 'Failed to update task');
      return false;
    }
  }, [tasks]);

  const updateTask = useCallback(async (
    taskId: number,
    updates: Partial<{
      title: string;
      description: string;
      tags: string;
      assignee: string;
      depends_on: number[];
      status: TaskStatus;
      priority: TaskPriority;
      updated_at: string;
    }>
  ) => {
    const response = await apiClient.updateTask(taskId, updates);

    if (response.ok && response.data) {
      setTasks(prev => prev.map(task => (task.id === taskId ? response.data! : task)));
      return true;
    }

    setError(response.error || 'Failed to update task');
    return false;
  }, []);

  const deleteTask = useCallback(async (taskId: number) => {
    const response = await apiClient.deleteTask(taskId);

    if (response.ok) {
      setTasks(prev =>
        prev.map(task =>
          task.id === taskId ? { ...task, deleted_at: new Date().toISOString() } : task
        )
      );
      return true;
    } else {
      setError(response.error || 'Failed to delete task');
      return false;
    }
  }, []);

  const restoreTask = useCallback(async (taskId: number) => {
    const response = await apiClient.restoreTask(taskId);

    if (response.ok && response.data) {
      setTasks(prev => prev.map(task => (task.id === taskId ? response.data! : task)));
      return true;
    }

    setError(response.error || 'Failed to restore task');
    return false;
  }, []);

  const requestReviewTask = useCallback(async (taskId: number) => {
    const currentTask = tasks.find((task) => task.id === taskId);
    if (!currentTask) {
      setError('Task not found in current state');
      return false;
    }

    const response = await apiClient.requestReviewTask(taskId, currentTask.updated_at);
    if (response.ok && response.data) {
      setTasks(prev => prev.map(task => (task.id === taskId ? response.data! : task)));
      return true;
    }

    setError(response.error || 'Failed to request review');
    return false;
  }, [tasks]);

  const approveTask = useCallback(async (taskId: number) => {
    const currentTask = tasks.find((task) => task.id === taskId);
    if (!currentTask) {
      setError('Task not found in current state');
      return false;
    }

    const response = await apiClient.approveTask(taskId, currentTask.updated_at);
    if (response.ok && response.data) {
      setTasks(prev => prev.map(task => (task.id === taskId ? response.data! : task)));
      return true;
    }

    setError(response.error || 'Failed to approve task');
    return false;
  }, [tasks]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    loading,
    error,
    addTask,
    updateTask,
    updateTaskStatus,
    deleteTask,
    restoreTask,
    requestReviewTask,
    approveTask,
    refetch: fetchTasks,
  };
}
