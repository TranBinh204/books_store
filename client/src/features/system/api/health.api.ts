import { http } from '@/lib/http';
import type { HealthStatus } from '../types/health.types';

export function getHealth() {
  return http.get<HealthStatus>('/health', { cache: 'no-store' });
}
