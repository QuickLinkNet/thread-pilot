import { useCallback, useEffect, useRef, useState } from 'react';

interface UseAutoRefreshOptions {
  intervalMs: number;
  enabled?: boolean;
  immediate?: boolean;
  refreshOnFocusVisible?: boolean;
  onRefresh: () => Promise<void> | void;
}

export function useAutoRefresh({
  intervalMs,
  enabled = true,
  immediate = false,
  refreshOnFocusVisible = false,
  onRefresh,
}: UseAutoRefreshOptions) {
  const [nextRefreshIn, setNextRefreshIn] = useState(Math.max(1, Math.ceil(intervalMs / 1000)));
  const nextRefreshAtRef = useRef(Date.now() + intervalMs);
  const intervalRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);

  const resetCountdown = useCallback(() => {
    nextRefreshAtRef.current = Date.now() + intervalMs;
    setNextRefreshIn(Math.max(1, Math.ceil(intervalMs / 1000)));
  }, [intervalMs]);

  const triggerRefresh = useCallback(async () => {
    if (!enabled || inFlightRef.current) return;

    inFlightRef.current = true;
    try {
      await onRefresh();
    } finally {
      inFlightRef.current = false;
      resetCountdown();
    }
  }, [enabled, onRefresh, resetCountdown]);

  useEffect(() => {
    if (!enabled) return;

    if (immediate) {
      void triggerRefresh();
    } else {
      resetCountdown();
    }

    intervalRef.current = window.setInterval(() => {
      void triggerRefresh();
    }, intervalMs);

    countdownRef.current = window.setInterval(() => {
      const seconds = Math.max(0, Math.ceil((nextRefreshAtRef.current - Date.now()) / 1000));
      setNextRefreshIn(seconds);
    }, 1000);

    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      if (countdownRef.current) window.clearInterval(countdownRef.current);
    };
  }, [enabled, immediate, intervalMs, resetCountdown, triggerRefresh]);

  useEffect(() => {
    if (!enabled || !refreshOnFocusVisible) return;

    const onVisibilityOrFocus = async () => {
      if (document.visibilityState === 'visible') {
        await triggerRefresh();
      }
    };

    window.addEventListener('focus', onVisibilityOrFocus);
    document.addEventListener('visibilitychange', onVisibilityOrFocus);

    return () => {
      window.removeEventListener('focus', onVisibilityOrFocus);
      document.removeEventListener('visibilitychange', onVisibilityOrFocus);
    };
  }, [enabled, refreshOnFocusVisible, triggerRefresh]);

  return {
    nextRefreshIn,
    triggerRefresh,
    resetCountdown,
  };
}
