import { Button } from '../atoms/Button';

interface TaskToolbarProps {
  nextTaskRefreshIn: number;
  lastTaskRefreshAt: Date | null;
  syncingTasks: boolean;
  showFilters: boolean;
  onRefresh: () => void;
  onToggleFilters: () => void;
  onCreateTask: () => void;
}

export function TaskToolbar({
  nextTaskRefreshIn,
  lastTaskRefreshAt,
  syncingTasks,
  showFilters,
  onRefresh,
  onToggleFilters,
  onCreateTask,
}: TaskToolbarProps) {
  return (
    <div className="task-toolbar">
      <div className="task-refresh-meta">
        <span>Next sync in {nextTaskRefreshIn}s</span>
        <span>Last sync: {lastTaskRefreshAt ? lastTaskRefreshAt.toLocaleTimeString() : 'not yet'}</span>
      </div>

      <Button
        size="sm"
        className="task-action-mini"
        onClick={onRefresh}
        aria-label="Refresh tasks"
        title="Refresh tasks"
        variant="ghost"
        disabled={syncingTasks}
      >
        <svg className="task-action-icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
          <path d="M20 11a8 8 0 1 0-2.34 5.66" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M20 4v7h-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Button>

      <Button
        size="sm"
        className="task-action-mini"
        onClick={onToggleFilters}
        aria-label="Suche und Filter"
        title="Suche und Filter"
        variant={showFilters ? 'primary' : 'ghost'}
      >
        <svg className="task-action-icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
          <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M16 16L21 21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </Button>

      <Button size="sm" className="task-action-mini" onClick={onCreateTask} aria-label="Add Task" title="Add Task">
        +
      </Button>
    </div>
  );
}
