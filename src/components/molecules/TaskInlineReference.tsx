import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { apiClient } from '../../lib/api-client';
import type { Task } from '../../types/api';

interface TaskInlineReferenceProps {
  taskId: number;
}

const taskCache = new Map<number, Task | null>();
const taskRequests = new Map<number, Promise<Task | null>>();

function toStatusLabel(status: Task['status']): string {
  switch (status) {
    case 'in_progress':
      return 'In Progress';
    case 'ready_for_review':
      return 'Ready For Review';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

async function loadTask(taskId: number): Promise<Task | null> {
  if (taskCache.has(taskId)) {
    return taskCache.get(taskId) ?? null;
  }

  const pending = taskRequests.get(taskId);
  if (pending) {
    return pending;
  }

  const request = apiClient
    .getTaskById(taskId)
    .then((response) => {
      const task = response.ok && response.data ? response.data : null;
      taskCache.set(taskId, task);
      return task;
    })
    .finally(() => {
      taskRequests.delete(taskId);
    });

  taskRequests.set(taskId, request);
  return request;
}

function useCanHover() {
  const [canHover, setCanHover] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    const listener = () => setCanHover(mq.matches);
    listener();
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, []);

  return canHover;
}

export function TaskInlineReference({ taskId }: TaskInlineReferenceProps) {
  const canHover = useCanHover();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [task, setTask] = useState<Task | null>(() => taskCache.get(taskId) ?? null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLSpanElement | null>(null);

  const dependsOnLabel = useMemo(() => {
    if (!task?.depends_on?.length) {
      return 'none';
    }
    return task.depends_on.map((id) => `#${id}`).join(', ');
  }, [task?.depends_on]);

  const loadPreview = async () => {
    if (task || loading) {
      return;
    }
    setLoading(true);
    const loaded = await loadTask(taskId);
    if (!loaded) {
      setError('Task nicht gefunden');
    } else {
      setTask(loaded);
      setError(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!open || canHover) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      const node = containerRef.current;
      if (!node) {
        return;
      }
      if (!node.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, canHover]);

  const onMouseEnter = async () => {
    if (!canHover) {
      return;
    }
    setOpen(true);
    await loadPreview();
  };

  const onMouseLeave = () => {
    if (canHover) {
      setOpen(false);
    }
  };

  const onClick = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (canHover) {
      return;
    }
    event.preventDefault();
    const next = !open;
    setOpen(next);
    if (next) {
      await loadPreview();
    }
  };

  return (
    <span
      className="task-inline-ref-wrap"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      ref={containerRef}
    >
      <button type="button" className="task-inline-ref" onClick={onClick}>
        #{taskId}
      </button>
      {open && (
        <div className="task-inline-preview" role="tooltip">
          {loading && <p className="task-inline-preview-loading">Lade Task...</p>}
          {!loading && error && <p className="task-inline-preview-error">{error}</p>}
          {!loading && !error && task && (
            <>
              <p className="task-inline-preview-id">#{task.id}</p>
              <p className="task-inline-preview-title">{task.title}</p>
              <p className="task-inline-preview-meta">
                Status: {toStatusLabel(task.status)}
                <br />
                Assignee: {task.assignee || 'none'}
              </p>
              <p className="task-inline-preview-deps">Depends on: {dependsOnLabel}</p>
              <p className="task-inline-preview-label">Kurzbeschreibung:</p>
              <p className="task-inline-preview-desc">{task.description}</p>
            </>
          )}
        </div>
      )}
    </span>
  );
}
