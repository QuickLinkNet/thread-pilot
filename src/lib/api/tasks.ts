import type {
  Task,
  TaskEvent,
  TaskRouteEntry,
  TaskRouteSuggestion,
  TaskPriority,
  TaskStatus,
} from '../../types/api';
import type { ApiCore } from './types';

export function createTasksApi(core: ApiCore) {
  return {
    getTasks(assignee?: string, includeDeleted: boolean = false) {
      const params = new URLSearchParams();
      if (assignee) {
        params.set('assignee', assignee);
      }
      if (includeDeleted) {
        params.set('include_deleted', '1');
      }
      const query = params.toString() ? `?${params.toString()}` : '';
      return core.request<Task[]>(`tasks${query}`);
    },

    getTaskById(id: number) {
      return core.request<Task>(`tasks/${id}`);
    },

    getTaskHistory(taskId: number) {
      return core.request<TaskEvent[]>(`tasks?action=history&task_id=${taskId}`);
    },

    getTaskRouteSuggestions(taskId?: number) {
      const query = taskId ? `&task_id=${taskId}` : '';
      return core.request<TaskRouteEntry[] | TaskRouteEntry>(`tasks?action=route_suggest${query}`);
    },

    addTask(task: {
      title: string;
      description: string;
      tags: string;
      assignee: string;
      depends_on?: number[];
      status?: TaskStatus;
      priority?: TaskPriority;
    }) {
      return core.request<Task>('tasks?action=add', {
        method: 'POST',
        body: JSON.stringify(task),
      });
    },

    updateTask(
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
    ) {
      return core.request<Task>('tasks?action=update', {
        method: 'POST',
        body: JSON.stringify({ task_id: taskId, ...updates }),
      });
    },

    deleteTask(taskId: number) {
      return core.request<{ deleted: boolean }>('tasks?action=delete', {
        method: 'POST',
        body: JSON.stringify({ task_id: taskId }),
      });
    },

    restoreTask(taskId: number) {
      return core.request<Task>('tasks?action=restore', {
        method: 'POST',
        body: JSON.stringify({ task_id: taskId }),
      });
    },

    requestReviewTask(taskId: number, updatedAt: string) {
      return core.request<Task>('tasks?action=request_review', {
        method: 'POST',
        body: JSON.stringify({ task_id: taskId, updated_at: updatedAt }),
      });
    },

    approveTask(taskId: number, updatedAt: string) {
      return core.request<Task>('tasks?action=approve', {
        method: 'POST',
        body: JSON.stringify({ task_id: taskId, updated_at: updatedAt }),
      });
    },

    claimTask(taskId: number) {
      return core.request<Task>('tasks?action=claim', {
        method: 'POST',
        body: JSON.stringify({ task_id: taskId }),
      });
    },

    releaseTask(taskId: number) {
      return core.request<Task>('tasks?action=release', {
        method: 'POST',
        body: JSON.stringify({ task_id: taskId }),
      });
    },

    applyTaskRoute(taskId: number, updatedAt: string) {
      return core.request<{ task: Task; suggestion: TaskRouteSuggestion }>('tasks?action=route_apply', {
        method: 'POST',
        body: JSON.stringify({ task_id: taskId, updated_at: updatedAt }),
      });
    },
  };
}
