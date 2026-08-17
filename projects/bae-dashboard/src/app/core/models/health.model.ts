export type ServiceStatus = 'checking' | 'ok' | 'degraded' | 'down';

export interface HealthReport {
  health: boolean;
  status: string;
  version: string | null;
  uptime: number;
  problems: { name: string; message?: string; status?: string }[] | null;
}

export const isHealthReport = (value: unknown): value is HealthReport =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as HealthReport).health === 'boolean';
