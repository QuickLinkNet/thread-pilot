import { useEffect, useMemo, useState } from 'react';
import { usePersonas } from '../../../hooks/usePersonas';
import { TASK_PRIORITY_LABELS, TASK_PRIORITY_VALUES } from '../../../lib/task-priority';
import type { Task, TaskPriority, TaskStatus } from '../../../types/api';
import { Button } from '../../atoms/Button';
import { Card } from '../../atoms/Card';
import { SelectField, TextAreaField, TextField } from '../../atoms/FormFields';

interface TaskFormData {
  title: string;
  description: string;
  tags: string;
  assignee: string;
  dependsOnInput: string;
  status: TaskStatus;
  priority: TaskPriority;
}

interface TaskModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialTask?: Task | null;
  onClose: () => void;
  onSubmit: (task: Omit<TaskFormData, 'dependsOnInput'> & { depends_on: number[] }) => Promise<void>;
}

const EMPTY_FORM: TaskFormData = {
  title: '',
  description: '',
  tags: '',
  assignee: '',
  dependsOnInput: '',
  status: 'open',
  priority: 'normal',
};

export function TaskModal({ isOpen, mode, initialTask, onClose, onSubmit }: TaskModalProps) {
  const { personas, loading } = usePersonas();
  const [formData, setFormData] = useState<TaskFormData>(EMPTY_FORM);

  const title = useMemo(() => (mode === 'edit' ? 'Edit Ticket' : 'Create New Ticket'), [mode]);
  const tagTokens = useMemo(
    () => formData.tags.split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean),
    [formData.tags]
  );
  const assigneeSuggestions = useMemo(() => {
    if (tagTokens.length === 0 || personas.length === 0) return [];

    const scored = personas.map((persona) => {
      const personaSkills = (persona.skills || []).map((skill) => skill.toLowerCase());
      let score = 0;

      for (const tag of tagTokens) {
        if (personaSkills.includes(tag)) {
          score += 2;
          continue;
        }

        if (personaSkills.some((skill) => skill.includes(tag) || tag.includes(skill))) {
          score += 1;
        }
      }

      return { persona, score };
    });

    return scored
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [personas, tagTokens]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (mode === 'edit' && initialTask) {
      setFormData({
        title: initialTask.title,
        description: initialTask.description,
        tags: initialTask.tags || '',
        assignee: initialTask.assignee,
        dependsOnInput: (initialTask.depends_on || []).join(', '),
        status: initialTask.status,
        priority: initialTask.priority ?? 'normal',
      });
      return;
    }

    setFormData(EMPTY_FORM);
  }, [isOpen, mode, initialTask]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dependsOn = formData.dependsOnInput
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value > 0);

    await onSubmit({
      title: formData.title,
      description: formData.description,
      tags: formData.tags.trim(),
      assignee: formData.assignee,
      status: formData.status,
      priority: formData.priority,
      depends_on: Array.from(new Set(dependsOn)),
    });

    if (mode === 'create') {
      setFormData(EMPTY_FORM);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <Card className="modal-card" elevated>
        <h3>{title}</h3>

        <form onSubmit={handleSubmit} className="modal-form">
          <TextField
            id="task-title"
            label="Title"
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
          />

          <TextAreaField
            id="task-description"
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
            rows={4}
          />

          <TextField
            id="task-tags"
            label="Tags (comma separated)"
            type="text"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="backend, bug, urgent"
          />

          <TextField
            id="task-depends"
            label="Depends on task IDs (comma separated)"
            type="text"
            value={formData.dependsOnInput}
            onChange={(e) => setFormData({ ...formData, dependsOnInput: e.target.value })}
            placeholder="3, 5, 12"
          />

          <SelectField
            id="task-assignee"
            label="Assignee"
            value={formData.assignee}
            onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
            required
            disabled={loading}
          >
            <option value="">{loading ? 'Loading personas...' : 'Select assignee'}</option>
            {personas.map((persona) => (
              <option key={persona.id} value={persona.name}>
                {persona.name} ({persona.role})
              </option>
            ))}
          </SelectField>

          {assigneeSuggestions.length > 0 && (
            <div className="task-assignee-suggestions">
              <span className="task-assignee-suggestions-label">Suggested by tags:</span>
              <div className="task-assignee-suggestions-actions">
                {assigneeSuggestions.map(({ persona, score }) => (
                  <Button
                    key={`suggest-${persona.id}`}
                    type="button"
                    size="sm"
                    variant={formData.assignee === persona.name ? 'primary' : 'ghost'}
                    onClick={() => setFormData({ ...formData, assignee: persona.name })}
                  >
                    {persona.name} ({score})
                  </Button>
                ))}
              </div>
            </div>
          )}

          <SelectField
            id="task-status"
            label="Scope / Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
          >
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="blocked">Blocked</option>
            <option value="ready_for_review">Ready For Review</option>
            <option value="done">Done</option>
          </SelectField>

          <SelectField
            id="task-priority"
            label="Priority"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
          >
            {TASK_PRIORITY_VALUES.map((priority) => (
              <option key={priority} value={priority}>
                {TASK_PRIORITY_LABELS[priority]}
              </option>
            ))}
          </SelectField>

          <div className="modal-actions">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {mode === 'edit' ? 'Save Ticket' : 'Create Ticket'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

