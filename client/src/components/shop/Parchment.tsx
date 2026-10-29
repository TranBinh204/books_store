import type { ElementType, ReactNode } from 'react';

/**
 * Giấy da rách mép (class `.parchment` trong styles/ui.css, bộ lọc #torn ở SvgDefs).
 * Lớp `.paper` nằm dưới chịu bộ lọc; chữ trong `.content` vẫn sắc nét.
 * `contentClassName`: padding / bố cục của phần chữ do nơi dùng quyết định.
 */
export function Parchment({
  children,
  className = '',
  contentClassName = '',
  as: Tag = 'div',
  ...rest
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  as?: ElementType;
} & Record<`data-${string}`, string | boolean | undefined> & { id?: string }) {
  return (
    <Tag className={`parchment ${className}`} {...rest}>
      <div className="paper" aria-hidden="true" />
      <div className={`content ${contentClassName}`}>{children}</div>
    </Tag>
  );
}
