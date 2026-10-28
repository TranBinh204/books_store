import { pool } from '../db/pool';

type ServiceStatus = 'up' | 'down';

export interface HealthStatus {
  status: 'ok' | 'degraded';
  database: ServiceStatus;
  timestamp: string;
}

async function check(fn: () => Promise<unknown>): Promise<ServiceStatus> {
  try {
    await fn();
    return 'up';
  } catch {
    return 'down';
  }
}

export async function getHealth(): Promise<HealthStatus> {
  const database = await check(() => pool.query('SELECT 1'));
  return {
    status: database === 'up' ? 'ok' : 'degraded',
    database,
    timestamp: new Date().toISOString(),
  };
}
