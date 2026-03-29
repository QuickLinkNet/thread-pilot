export function formatActivityLabel(latestAt: string, now: Date): string {
  const latestDate = new Date(latestAt);
  const diffMs = now.getTime() - latestDate.getTime();
  if (Number.isNaN(diffMs) || diffMs < 0) {
    return 'offline';
  }

  const maxActiveMs = 24 * 60 * 60 * 1000;
  if (diffMs > maxActiveMs) {
    return 'offline';
  }

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) {
    return 'vor <1 min';
  }
  if (minutes < 60) {
    return `vor ${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  return `vor ${hours} h`;
}

export function toDayKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDayLabel(dayKey: string, now: Date): string {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const todayKey = toDayKey(today);
  const yesterdayKey = toDayKey(yesterday);

  if (dayKey === todayKey) {
    return 'Heute';
  }
  if (dayKey === yesterdayKey) {
    return 'Gestern';
  }

  const [year, month, day] = dayKey.split('-').map(Number);
  const parsed = new Date(year, (month || 1) - 1, day || 1);
  const dayDiff = Math.floor((today.getTime() - parsed.getTime()) / (24 * 60 * 60 * 1000));

  if (dayDiff >= 2 && dayDiff <= 6) {
    const weekday = new Intl.DateTimeFormat('de-DE', { weekday: 'long' }).format(parsed);
    return weekday.charAt(0).toUpperCase() + weekday.slice(1);
  }

  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(parsed);
}

