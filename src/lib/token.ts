export const THREAD_PILOT_TOKEN_PATTERN = /^[a-f0-9]{64}$/i;

export function normalizeThreadPilotToken(value: string): string {
  return value.trim();
}

export function isValidThreadPilotToken(value: string): boolean {
  const token = normalizeThreadPilotToken(value);
  return THREAD_PILOT_TOKEN_PATTERN.test(token);
}
