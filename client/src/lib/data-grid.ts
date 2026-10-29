import type { GridColDef, GridPaginationModel, GridValidRowModel } from '@mui/x-data-grid';

/** Dòng bảng có kèm số thứ tự hiển thị (không phải id trong DB) */
export type WithRowNumber<T> = T & { rowNumber: number };

/**
 * Gắn số thứ tự 1, 2, 3... cho các dòng của trang hiện tại, nối tiếp giữa các trang
 * (trang 2, 20 dòng / trang → bắt đầu từ 21).
 */
export function withRowNumbers<T>(rows: T[], pagination: GridPaginationModel): WithRowNumber<T>[] {
  const offset = pagination.page * pagination.pageSize;
  return rows.map((row, index) => ({ ...row, rowNumber: offset + index + 1 }));
}

/** Cột "STT" dùng chung cho các bảng Admin — thay cho cột ID */
export function rowNumberColumn<T extends GridValidRowModel>(): GridColDef<WithRowNumber<T>> {
  return {
    field: 'rowNumber',
    headerName: 'STT',
    width: 70,
    align: 'center',
    headerAlign: 'center',
    sortable: false,
  };
}
