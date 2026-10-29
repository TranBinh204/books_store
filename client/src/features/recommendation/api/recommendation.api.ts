import type { IdName } from '@/features/catalog';
import { http } from '@/lib/http';
import type { Preferences, RecommendationResult, SavePreferencesPayload } from '../types';

export async function getPreferences() {
  return (await http.get<Preferences>('/me/preferences')).data;
}

export async function savePreferences(payload: SavePreferencesPayload) {
  return (await http.put<Preferences>('/me/preferences', payload)).data;
}

export async function skipPreferences() {
  return (await http.post<Preferences>('/me/preferences/skip')).data;
}

export async function getRecommendations() {
  return (await http.get<RecommendationResult>('/me/recommendations')).data;
}

export async function refreshRecommendations() {
  return (await http.post<RecommendationResult>('/me/recommendations/refresh')).data;
}

/** Ô chọn "Tác giả yêu thích" */
export async function searchAuthors(q: string) {
  return (await http.get<IdName[]>('/authors', { query: { q: q || undefined, limit: 10 } })).data;
}
