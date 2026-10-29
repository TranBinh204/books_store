import Link from 'next/link';
import { SectionTitle } from '@/components/shop/SectionTitle';
import type { HomeAuthor } from '../../types/home.types';
import { MageSigil } from './MageSigil';
import styles from './MageGrid.module.css';

/** Chương VIII · "Hội pháp sư ngôn từ" (A5, trang chủ khối 12) — bấm → sách của tác giả */
export function MageGrid({ authors }: { authors: HomeAuthor[] }) {
  if (authors.length === 0) return null;
  return (
    <section className="sec" id="mages" data-pausable>
      <div className="wrap">
        <SectionTitle
          chapter="Chương VIII · Tác giả"
          title={
            <>
              Hội <em>pháp sư</em> ngôn từ
            </>
          }
        />
        <div className={styles.mages} data-stagger="">
          {authors.map((author) => (
            <Link
              key={author.id}
              href={`/tim-kiem?authorId=${author.id}`}
              className={`${styles.mage} sigil-host`}
            >
              <MageSigil id={author.id} name={author.name} className={styles.sigil} />
              <b>{author.name}</b>
              <small>
                {author.bookCount} cuốn{author.mainCategory ? ` · ${author.mainCategory}` : ''}
              </small>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
