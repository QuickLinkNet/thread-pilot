import { useState } from 'react';
import type { Persona } from '../../types/api';
import { usePersonas } from '../../hooks/usePersonas';
import { apiClient } from '../../lib/api-client';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { TextField } from '../atoms/FormFields';
import { AlertBox } from '../molecules/AlertBox';
import { SectionHeader } from '../molecules/SectionHeader';

export function PersonaManager() {
  const { personas, loading, error, refetch } = usePersonas();
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [skills, setSkills] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editSkills, setEditSkills] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const parseSkills = (value: string) => value
    .split(',')
    .map((skill) => skill.trim())
    .filter(Boolean);

  const copyToken = async (persona: Persona) => {
    await navigator.clipboard.writeText(persona.token);
    setCopiedId(persona.id);
    setTimeout(() => setCopiedId(null), 1000);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    const response = await apiClient.addPersona({
      name: name.trim(),
      role: role.trim(),
      skills: parseSkills(skills),
    });
    if (!response.ok) {
      setActionError(response.error || 'Could not create persona');
      return;
    }

    setName('');
    setRole('');
    setSkills('');
    await refetch();
  };

  const openEdit = (persona: Persona) => {
    setEditingId(persona.id);
    setEditName(persona.name);
    setEditRole(persona.role);
    setEditSkills((persona.skills || []).join(', '));
  };

  const saveEdit = async (id: number) => {
    setBusyId(id);
    setActionError(null);
    const response = await apiClient.updatePersona(id, {
      name: editName.trim(),
      role: editRole.trim(),
      skills: parseSkills(editSkills),
    });

    if (!response.ok) {
      setActionError(response.error || 'Could not update persona');
      setBusyId(null);
      return;
    }

    setEditingId(null);
    setBusyId(null);
    await refetch();
  };

  const regenToken = async (id: number) => {
    setBusyId(id);
    setActionError(null);
    const response = await apiClient.regeneratePersonaToken(id);
    if (!response.ok) {
      setActionError(response.error || 'Could not regenerate token');
      setBusyId(null);
      return;
    }

    setBusyId(null);
    await refetch();
  };

  const removePersona = async (id: number) => {
    if (!confirm('Delete this persona? Existing token will stop working.')) {
      return;
    }

    setBusyId(id);
    setActionError(null);
    const response = await apiClient.deletePersona(id);
    if (!response.ok) {
      setActionError(response.error || 'Could not delete persona');
      setBusyId(null);
      return;
    }

    setBusyId(null);
    await refetch();
  };

  return (
    <section className="content-panel persona-panel">
      <SectionHeader
        title="Persona Management"
        subtitle="Create, edit and rotate tokens for personas"
      />

      <div className="persona-body">
        <Card className="persona-create">
          <form onSubmit={handleAdd} className="persona-create-form">
            <TextField
              id="persona-name"
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <TextField
              id="persona-role"
              label="Role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            />
            <TextField
              id="persona-skills"
              label="Skills (comma separated)"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="php, api, database"
            />
            <Button type="submit" size="sm">
              Add Persona
            </Button>
          </form>
        </Card>

        {(error || actionError) && <AlertBox>{actionError || error}</AlertBox>}

        <div className="persona-feed">
          {loading ? (
            <Card className="empty-state">Loading personas...</Card>
          ) : (
            personas.map((persona) => (
              <Card key={persona.id} className="persona-item">
                {editingId === persona.id ? (
                  <div className="persona-edit-grid">
                    <TextField
                      id={`edit-name-${persona.id}`}
                      label="Name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                    <TextField
                      id={`edit-role-${persona.id}`}
                      label="Role"
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                    />
                    <TextField
                      id={`edit-skills-${persona.id}`}
                      label="Skills (comma separated)"
                      value={editSkills}
                      onChange={(e) => setEditSkills(e.target.value)}
                      placeholder="php, api, database"
                    />
                  </div>
                ) : (
                  <div className="persona-head">
                    <div>
                      <strong>{persona.name}</strong>
                      <span>{persona.role}</span>
                    </div>
                    <div className="persona-skills">
                      {(persona.skills || []).length === 0 ? (
                        <span className="persona-skill-empty">No skills</span>
                      ) : (
                        (persona.skills || []).map((skill) => (
                          <span key={`${persona.id}-${skill}`} className="persona-skill-chip">
                            {skill}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                )}

                <label className="checker-label">Token</label>
                <code className="checker-code">{persona.token}</code>

                <div className="persona-actions">
                  {editingId === persona.id ? (
                    <>
                      <Button size="sm" onClick={() => saveEdit(persona.id)} disabled={busyId === persona.id}>
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                        disabled={busyId === persona.id}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(persona)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => copyToken(persona)}>
                        {copiedId === persona.id ? 'Copied' : 'Copy Token'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => regenToken(persona.id)} disabled={busyId === persona.id}>
                        Regenerate Token
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => removePersona(persona.id)} disabled={busyId === persona.id}>
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
