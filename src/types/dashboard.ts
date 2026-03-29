export const DASHBOARD_TAB_ORDER = [
  'chat',
  'tasks',
  'events',
  'contract',
  'personas',
  'system',
  'api',
] as const;

export type DashboardTab = (typeof DASHBOARD_TAB_ORDER)[number];

export const DEFAULT_DASHBOARD_TAB: DashboardTab = 'chat';

export function isDashboardTab(value: string): value is DashboardTab {
  return (DASHBOARD_TAB_ORDER as readonly string[]).includes(value);
}
