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
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);

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
    if (!open) {
      return;
    }

    const updatePosition = () => {
      const button = containerRef.current?.querySelector('.task-inline-ref');
      const preview = previewRef.current;
      if (!button || !preview) {
        return;
      }

      const buttonRect = button.getBoundingClientRect();
      const previewRect = preview.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const margin = 16;

      let top = buttonRect.bottom + 8;
      let left = buttonRect.left;

      if (left + previewRect.width > viewportWidth - margin) {
        left = viewportWidth - previewRect.width - margin;
      }
      if (left < margin) {
        left = margin;
      }

      if (top + previewRect.height > viewportHeight - margin) {
        top = buttonRect.top - previewRect.height - 8;
      }
      if (top < margin) {
        top = margin;
      }

      setPosition({ top, left });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open]);

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
        <div
          className="task-inline-preview"
          role="tooltip"
          ref={previewRef}
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
          }}
        >
          {loading && <p className="task-inline-preview-loading">Lade Task...</p>}
          {!loading && error && <p className="task-inline-preview-error">{error}</p>}
          {!loading && !error && task && (
            <>
              <div className="task-inline-preview-header">
                <span className="task-inline-preview-id">#{task.id}</span>
                <span className="task-inline-preview-status">{toStatusLabel(task.status)}</span>
              </div>
              <p className="task-inline-preview-title">{task.title}</p>
              <div className="task-inline-preview-meta">
                <span>👤 {task.assignee || 'Unassigned'}</span>
                {task.depends_on && task.depends_on.length > 0 && (
                  <span>🔗 {dependsOnLabel}</span>
                )}
              </div>
              {task.description && (
                <p className="task-inline-preview-desc">{task.description}</p>
              )}
            </>
          )}
        </div>
      )}
    </span>
  );
}
