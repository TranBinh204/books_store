import { Tooltip } from '@mui/material';
import { AdminTag } from '@/components/ui/AdminTag';

/** Tag Đang hiện / Đã ẩn (tooltip = lý do ẩn) */
export function ReviewStatusTag({
  isHidden,
  hiddenReason,
}: {
  isHidden: boolean;
  hiddenReason: string | null;
}) {
  if (!isHidden) return <AdminTag tone="ok">Đang hiện</AdminTag>;
  return (
    <Tooltip title={`Lý do: ${hiddenReason ?? ''}`}>
      <span>
        <AdminTag tone="bad">Đã ẩn</AdminTag>
      </span>
    </Tooltip>
  );
}
