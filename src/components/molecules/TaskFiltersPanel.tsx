import { Button } from '../atoms/Button';
import { SelectField, TextField } from '../atoms/FormFields';
import { TASK_PRIORITY_LABELS, TASK_PRIORITY_VALUES } from '../../lib/task-priority';
import type { TaskPriority, TaskStatus } from '../../types/api';
import type { SortMode } from '../../lib/task-list-utils';

interface TaskFiltersPanelProps {
  searchTerm: string;
  statusFilter: 'all' | TaskStatus;
  priorityFilter: 'all' | TaskPriority;
  assigneeFilter: string;
  tagFilter: string;
  sortMode: SortMode;
  assigneeOptions: string[];
  tagOptions: string[];
  quickUnassignedOnly: boolean;
  quickUpdatedTodayOnly: boolean;
  onSearchTermChange: (value: string) => void;
  onStatusFilterChange: (value: 'all' | TaskStatus) => void;
  onPriorityFilterChange: (value: 'all' | TaskPriority) => void;
  onAssigneeFilterChange: (value: string) => void;
  onTagFilterChange: (value: string) => void;
  onSortModeChange: (value: SortMode) => void;
  onToggleQuickUnassigned: () => void;
  onToggleQuickUpdatedToday: () => void;
}

export function TaskFiltersPanel({
  searchTerm,
  statusFilter,
  priorityFilter,
  assigneeFilter,
  tagFilter,
  sortMode,
  assigneeOptions,
  tagOptions,
  quickUnassignedOnly,
  quickUpdatedTodayOnly,
  onSearchTermChange,
  onStatusFilterChange,
  onPriorityFilterChange,
  onAssigneeFilterChange,
  onTagFilterChange,
  onSortModeChange,
  onToggleQuickUnassigned,
  onToggleQuickUpdatedToday,
}: TaskFiltersPanelProps) {
  return (
    <>
      <div className="task-controls card">
        <TextField
          id="task-search"
          label="Search"
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          placeholder="ID, title, description, assignee, tags..."
        />

        <SelectField
          id="task-status-filter"
          label="Status"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as 'all' | TaskStatus)}
        >
          <option value="all">All</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="blocked">Blocked</option>
          <option value="ready_for_review">Ready For Review</option>
          <option value="done">Done</option>
        </SelectField>

        <SelectField
          id="task-priority-filter"
          label="Priority"
          value={priorityFilter}
          onChange={(e) => onPriorityFilterChange(e.target.value as 'all' | TaskPriority)}
        >
          <option value="all">All</option>
          {TASK_PRIORITY_VALUES.map((priority) => (
            <option key={priority} value={priority}>
              {TASK_PRIORITY_LABELS[priority]}
            </option>
          ))}
        </SelectField>

        <SelectField id="task-assignee-filter" label="Assignee" value={assigneeFilter} onChange={(e) => onAssigneeFilterChange(e.target.value)}>
          {assigneeOptions.map((value) => (
            <option key={value} value={value}>
              {value === 'all' ? 'All' : value}
            </option>
          ))}
        </SelectField>

        <SelectField id="task-tag-filter" label="Tag" value={tagFilter} onChange={(e) => onTagFilterChange(e.target.value)}>
          {tagOptions.map((value) => (
            <option key={value} value={value}>
              {value === 'all' ? 'All' : value}
            </option>
          ))}
        </SelectField>

        <SelectField id="task-sort" label="Sort" value={sortMode} onChange={(e) => onSortModeChange(e.target.value as SortMode)}>
          <option value="updated_desc">Updated (newest)</option>
          <option value="updated_asc">Updated (oldest)</option>
          <option value="id_desc">ID (desc)</option>
          <option value="id_asc">ID (asc)</option>
          <option value="title_asc">Title (A-Z)</option>
        </SelectField>
      </div>

      <div className="task-quick-filters">
        <Button size="sm" variant={quickUnassignedOnly ? 'primary' : 'ghost'} onClick={onToggleQuickUnassigned}>
          Unassigned
        </Button>
        <Button size="sm" variant={quickUpdatedTodayOnly ? 'primary' : 'ghost'} onClick={onToggleQuickUpdatedToday}>
          Updated Today
        </Button>
      </div>
    </>
  );
}
