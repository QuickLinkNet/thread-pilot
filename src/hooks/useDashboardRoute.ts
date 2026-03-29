import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_DASHBOARD_TAB, isDashboardTab, type DashboardTab } from '../types/dashboard';

const TAB_HASH: Record<DashboardTab, string> = {
  chat: '#/chat',
  tasks: '#/tasks',
  events: '#/events',
  contract: '#/contract',
  personas: '#/personas',
  system: '#/system',
  api: '#/api',
};

function tabFromHash(hash: string): DashboardTab {
  const normalized = hash.replace(/^#\/?/, '').trim().toLowerCase();
  if (isDashboardTab(normalized)) {
    return normalized;
  }
  return DEFAULT_DASHBOARD_TAB;
}

export function useDashboardRoute() {
  const [activeTab, setActiveTab] = useState<DashboardTab>(() => tabFromHash(window.location.hash));

  useEffect(() => {
    const onHashChange = () => {
      setActiveTab(tabFromHash(window.location.hash));
    };

    if (!window.location.hash) {
      window.history.replaceState(null, '', TAB_HASH[DEFAULT_DASHBOARD_TAB]);
      setActiveTab(DEFAULT_DASHBOARD_TAB);
    }

    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigateToTab = useCallback((tab: DashboardTab) => {
    const nextHash = TAB_HASH[tab];
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
      return;
    }
    setActiveTab(tab);
  }, []);

  return {
    activeTab,
    navigateToTab,
  };
}
