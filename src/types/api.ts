export const MESSAGE_TYPES = [
  'message',
  'question',
  'status',
  'handoff',
  'decision',
  'blocker',
  'review',
  'directive',
  'announcement',
  'shutdown',
  'priority',
] as const;

export interface Persona {
  id: number;
  name: string;
  role: string;
  skills?: string[];
  token: string;
  created_at: string;
}

export type MessageType = (typeof MESSAGE_TYPES)[number];

export interface Message {
  id: number;
  sender: string;
  recipient?: string;
  type?: MessageType;
  task_id?: number | null;
  mentions?: string[] | string;
  content: string;
  created_at: string;
}

export interface MessageSyncData {
  items: Message[];
  since_id: number;
  last_id: number;
  count: number;
}

export type TaskStatus = 'open' | 'in_progress' | 'blocked' | 'ready_for_review' | 'done';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Task {
  id: number;
  title: string;
  description: string;
  tags: string;
  assignee: string;
  status: TaskStatus;
  priority: TaskPriority;
  locked_by?: string | null;
  depends_on?: number[];
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskEvent {
  id: number;
  task_id: number;
  actor: string;
  event_type: string;
  event_payload: Record<string, unknown>;
  created_at: string;
}

export interface SystemHealth {
  status: string;
  service: string;
  time: string;
  database: string;
}

export interface SystemStats {
  requested_by: string;
  personas_total: number;
  messages_total: number;
  messages_last_24h: number;
  tasks_active_total: number;
  tasks_deleted_total: number;
  tasks_locked_total?: number;
  tasks_unassigned_total: number;
  tasks_by_status: Record<string, number>;
  time: string;
}

export interface DbTableInfo {
  name: string;
  row_count: number;
}

export interface DbSchemaColumn {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

export interface DbSchemaResponse {
  table: string;
  columns: DbSchemaColumn[];
}

export interface DbRowsResponse {
  table: string;
  limit: number;
  offset: number;
  total: number;
  columns: string[];
  rows: Array<Record<string, unknown>>;
}

export interface GlobalEvent {
  id: number;
  event_type: string;
  actor: string;
  entity_type: string;
  entity_id: number | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface TaskRouteSuggestion {
  kind: 'ready' | 'blocked' | 'locked' | 'no_match';
  message: string;
  suggested_assignee?: string;
  suggested_status?: TaskStatus;
  score?: number;
  locked_by?: string;
  blockers?: Array<{ id: number; reason: string; status?: string }>;
}

export interface TaskRouteEntry {
  task_id: number;
  suggestion: TaskRouteSuggestion;
}


export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface PersonaContract {
  id: number | null;
  version: string;
  mode: 'full';
  requested_by: string;
  first_reply_required: string;
  text: string;
  change_note: string;
  created_by: string;
  created_at: string;
  source_of_truth: string;
}

export interface PersonaContractHistoryItem {
  id: number;
  version: string;
  content_text: string;
  change_note: string;
  created_by: string;
  is_active: number;
  created_at: string;
}

export interface FirstMessage {
  id: number;
  version: string;
  text: string;
  change_note: string;
  created_by: string;
  created_at: string;
}

export interface FirstMessageHistoryItem {
  id: number;
  version: string;
  content_text: string;
  change_note: string;
  created_by: string;
  is_active: number;
  created_at: string;
}

