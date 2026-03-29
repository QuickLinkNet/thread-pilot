import { Chat } from './Chat';
import { TaskList } from './TaskList';
import { EventsStream } from './EventsStream';
import { ApiChecker } from './ApiChecker';
import { ContractManager } from './ContractManager';
import { PersonaManager } from './PersonaManager';
import { SystemStatus } from './SystemStatus';
import { Button } from '../atoms/Button';
import { SidebarTabs } from '../molecules/SidebarTabs';
import { useDashboardRoute } from '../../hooks/useDashboardRoute';
import type { DashboardTab } from '../../types/dashboard';
import { useState } from 'react';
import logo from '../../assets/logo_transparent.png';

function renderTab(tab: DashboardTab, navigateToTab: (tab: DashboardTab) => void) {
  if (tab === 'chat') return <Chat />;
  if (tab === 'tasks') return <TaskList />;
  if (tab === 'events') return <EventsStream onNavigate={(nextTab) => navigateToTab(nextTab)} />;
  if (tab === 'contract') return <ContractManager />;
  if (tab === 'personas') return <PersonaManager />;
  if (tab === 'system') return <SystemStatus />;
  return <ApiChecker />;
}

export function Dashboard() {
  const { activeTab, navigateToTab } = useDashboardRoute();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('api_token');
    window.location.reload();
  };

  const handleTabChange = (tab: DashboardTab) => {
    navigateToTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <div className="app-shell dashboard-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <img src={logo} alt="Thread Pilot" className="topbar-logo" />
        </div>
        <div className="topbar-actions">
          <Button
            variant="ghost"
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Menue schliessen' : 'Menue oeffnen'}
          >
            {mobileMenuOpen ? 'Close' : 'Menu'}
          </Button>
          <Button variant="ghost" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </header>

      {mobileMenuOpen && (
        <button
          type="button"
          className="mobile-nav-backdrop"
          aria-label="Navigation schliessen"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className="dashboard-main">
        <nav className={`dashboard-sidebar ${mobileMenuOpen ? 'dashboard-sidebar-open' : ''}`}>
          <SidebarTabs activeTab={activeTab} onChange={handleTabChange} />
        </nav>

        <main className="dashboard-content">{renderTab(activeTab, navigateToTab)}</main>
      </div>
    </div>
  );
}
