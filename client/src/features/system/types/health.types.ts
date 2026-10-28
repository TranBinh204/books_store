type ServiceStatus = 'up' | 'down';

export interface HealthStatus {
  status: 'ok' | 'degraded';
  database: ServiceStatus;
  timestamp: string;
}
