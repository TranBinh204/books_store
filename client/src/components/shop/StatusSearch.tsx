'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { IconSearch } from '@/components/ui/icons';
import styles from './StatusPage.module.css';

/** Ô tìm sách trên trang 404 → /tim-kiem?q=... */
export function StatusSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  return (
    <form
      className={styles.search}
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        const q = query.trim();
        if (q) router.push(`/tim-kiem?q=${encodeURIComponent(q)}`);
      }}
    >
      <input
        className="field"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Tìm sách, tác giả..."
        aria-label="Tìm sách"
      />
      <button type="submit" className="btn btn-gold" aria-label="Tìm">
        <IconSearch width="20" height="20" />
      </button>
    </form>
  );
}
