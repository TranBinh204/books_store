'use client';

import { ThemeProvider } from '@mui/material/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { QueryClientProvider } from '@tanstack/react-query';
import { SnackbarProvider } from 'notistack';
import { useState, type ReactNode } from 'react';
import 'dayjs/locale/vi';
import { MagicToast } from '@/components/ui/MagicToast';
import { useTopLayerElement } from '@/hooks/useTopLayer';
import { makeQueryClient } from '@/lib/queryClient';
import { theme } from '@/theme/theme';
import toastRootStyles from './ToastRoot.module.css';

const TOAST_HIDE_MS = 2400;
const TOAST_COMPONENTS = {
  default: MagicToast,
  success: MagicToast,
  error: MagicToast,
  warning: MagicToast,
  info: MagicToast,
};

export function AppProviders({ children }: { children: ReactNode }) {
  // Toast hiện trong lớp trên cùng của trình duyệt (popover thủ công) để không chìm dưới hộp thoại <dialog>
  const [toastRoot, setToastRoot] = useState<HTMLDivElement | null>(null);
  useTopLayerElement(toastRoot);
  // Mỗi trình duyệt một QueryClient, không tạo lại khi re-render
  const [queryClient] = useState(makeQueryClient);

  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="vi">
        <QueryClientProvider client={queryClient}>
          {/* Toast kiểu demo 07: giữa đáy màn hình, tự tắt sau 2.4s (components.md Q5) */}
          <div ref={setToastRoot} popover="manual" className={toastRootStyles.root} />
          <SnackbarProvider
            domRoot={toastRoot ?? undefined}
            maxSnack={3}
            autoHideDuration={TOAST_HIDE_MS}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            Components={TOAST_COMPONENTS}
          >
            {children}
          </SnackbarProvider>
        </QueryClientProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}
