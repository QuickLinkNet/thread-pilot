import { Button } from '../atoms/Button';
import { cx } from '../../lib/classnames';
import type { DashboardTab } from '../../types/dashboard';

interface SidebarTabsProps {
  activeTab: DashboardTab;
  onChange: (tab: DashboardTab) => void;
}

const TAB_ITEMS: Array<{ key: DashboardTab; label: string }> = [
  { key: 'chat', label: 'Team Chat' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'events', label: 'Events' },
  { key: 'contract', label: 'Contract' },
  { key: 'first-message', label: 'First Message' },
  { key: 'personas', label: 'Personas' },
  { key: 'system', label: 'System' },
  { key: 'api', label: 'API Checker' },
];

export function SidebarTabs({ activeTab, onChange }: SidebarTabsProps) {
  return (
    <nav className="sidebar-tabs" aria-label="Dashboard navigation">
      {TAB_ITEMS.map((item) => (
        <Button
          key={item.key}
          variant={activeTab === item.key ? 'primary' : 'ghost'}
          className={cx('tab-btn', activeTab === item.key && 'tab-btn-active')}
          onClick={() => onChange(item.key)}
        >
          {item.label}
        </Button>
      ))}
    </nav>
  );
}
