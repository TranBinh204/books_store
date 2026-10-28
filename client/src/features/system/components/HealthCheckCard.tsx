'use client';

import { Button, Card, CardContent, Chip, CircularProgress } from '@mui/material';
import { useSnackbar } from 'notistack';
import { formatDateTime } from '@/lib/format';
import { useHealth } from '../hooks/useHealth';

/** Trang kiểm tra Giai đoạn 0: client → /api (rewrite) → server → PostgreSQL */
export function HealthCheckCard() {
  const { data, isLoading, isError, error, refetch, isFetching } = useHealth();
  const { enqueueSnackbar } = useSnackbar();

  const handleRefetch = async () => {
    const result = await refetch();
    enqueueSnackbar(
      result.data?.status === 'ok' ? 'Kết nối server thành công' : 'Không kết nối được server',
      { variant: result.data?.status === 'ok' ? 'success' : 'error' },
    );
  };

  return (
    <Card className="w-full max-w-md">
      <CardContent className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-primary">Kiểm tra kết nối</h2>

        {isLoading && <CircularProgress size={24} />}

        {isError && <p className="text-sale">{error.message}</p>}

        {data && (
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Server</span>
              <Chip
                size="small"
                label={data.status}
                color={data.status === 'ok' ? 'success' : 'error'}
              />
            </div>
            <div className="flex items-center justify-between">
              <span>PostgreSQL</span>
              <Chip
                size="small"
                label={data.database}
                color={data.database === 'up' ? 'success' : 'error'}
              />
            </div>
            <p className="text-text-muted">Cập nhật: {formatDateTime(data.timestamp)}</p>
          </div>
        )}

        <Button variant="contained" onClick={handleRefetch} loading={isFetching}>
          Kiểm tra lại
        </Button>
      </CardContent>
    </Card>
  );
}
