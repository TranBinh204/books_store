'use client';

import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/useDebounce';
import { AUTOCOMPLETE_DEBOUNCE_MS } from '@/lib/constants';
import * as catalogApi from '../api/catalog.api';
import { SUGGESTION_MIN_LENGTH } from '../constants';

/** Gợi ý sách khi gõ ô tìm kiếm: debounce, chỉ gọi khi ≥ SUGGESTION_MIN_LENGTH ký tự */
export function useSuggestions(keyword: string) {
  const debounced = useDebounce(keyword.trim(), AUTOCOMPLETE_DEBOUNCE_MS);
  const enabled = debounced.length >= SUGGESTION_MIN_LENGTH;

  const query = useQuery({
    queryKey: ['catalog', 'suggestions', debounced],
    queryFn: () => catalogApi.getSuggestions(debounced),
    enabled,
  });

  return {
    suggestions: enabled ? (query.data ?? []) : [],
    /** Đang chờ gõ xong (debounce) hoặc đang gọi API */
    loading: keyword.trim() !== debounced || (enabled && query.isFetching),
    isError: query.isError,
  };
}
