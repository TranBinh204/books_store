'use client';

import { createTheme } from '@mui/material/styles';
import { viVN } from '@mui/material/locale';
import { viVN as dataGridViVN } from '@mui/x-data-grid/locales';
import type {} from '@mui/x-data-grid/themeAugmentation';

/**
 * NGUỒN DUY NHẤT cho màu & font của cả MUI và Tailwind.
 * `cssVariables: true` → MUI sinh biến --mui-palette-*, globals.css map sang class Tailwind.
 * Bảng màu Dark Fantasy lấy nguyên từ demo 07 — docs/06-ui-ux/design-system.md mục 2 & 10.1.
 */
export const palette = {
  night: '#0e1311',
  night2: '#121a17',
  forest: '#17251f',
  moss: '#2c4a3e',
  moss2: '#1f3530',
  gold: '#b5946a',
  goldHi: '#e2c48f',
  bone: '#efe8dc',
  bone2: '#b9b2a4',
  parch: '#d9bd93',
  parch2: '#c39f74',
  ink: '#2a1d10',
  blood: '#8e2b2b',
  ember: '#e0803e',
} as const;

// Đường viền / nền mờ dùng lặp trong các override MUI (khu Admin) — docs/06-ui-ux/admin/00-khung-admin.md mục 3.1
const line = 'rgba(181, 148, 106, 0.22)';
const lineStrong = 'rgba(181, 148, 106, 0.35)';
const rowLine = 'rgba(181, 148, 106, 0.18)';
const goldTint = 'rgba(181, 148, 106, 0.12)';
const goldHover = 'rgba(181, 148, 106, 0.08)';
const popupShadow = '0 20px 40px rgba(0, 0, 0, 0.6)';
const headingFont = 'var(--nf-heading), serif';

export const theme = createTheme(
  {
    cssVariables: true,
    palette: {
      mode: 'dark',
      primary: {
        main: palette.goldHi,
        light: '#f6e7c1',
        dark: palette.gold,
        contrastText: palette.night,
      },
      secondary: { main: palette.moss, contrastText: palette.bone },
      error: { main: palette.blood, light: '#e06060', contrastText: '#f6dcc8' },
      warning: { main: palette.ember },
      info: { main: palette.gold, light: palette.goldHi, contrastText: palette.night },
      success: { main: palette.moss, light: '#6f9b75', contrastText: palette.bone },
      text: { primary: palette.bone, secondary: palette.bone2 },
      divider: line,
      background: { default: palette.night, paper: palette.night2 },
    },
    typography: {
      fontFamily: 'var(--nf-body), Georgia, serif',
      fontSize: 15,
      h1: { fontFamily: 'var(--nf-display), serif', fontWeight: 700 },
      h2: { fontFamily: 'var(--nf-display), serif', fontWeight: 700 },
      h3: { fontFamily: 'var(--nf-display), serif', fontWeight: 700 },
      h4: { fontFamily: headingFont, fontWeight: 700 },
      h5: { fontFamily: headingFont, fontWeight: 700 },
      h6: { fontFamily: headingFont, fontWeight: 700 },
      button: {
        fontFamily: headingFont,
        fontWeight: 700,
        fontSize: '1rem',
        letterSpacing: '0.04em',
        textTransform: 'none',
      },
    },
    // Góc gần vuông là chủ đạo (design-system mục 5.1)
    shape: { borderRadius: 4 },
    components: {
      MuiPaper: {
        styleOverrides: {
          // Tắt lớp phủ sáng mặc định của dark mode — nền giữ đúng --night-2
          root: { backgroundImage: 'none' },
          // Bảng làm việc phẳng của Admin
          outlined: { borderColor: line, borderRadius: 6, boxShadow: 'none' },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: { border: `1px solid ${line}`, borderRadius: 6, boxShadow: 'none' },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: { border: `1px solid ${palette.gold}`, boxShadow: '0 0 60px rgba(0, 0, 0, 0.8)' },
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: {
            fontFamily: headingFont,
            fontWeight: 700,
            fontSize: '1.4rem',
            color: palette.goldHi,
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        variants: [
          {
            props: { variant: 'contained', color: 'primary' },
            style: {
              backgroundColor: palette.goldHi,
              color: palette.ink,
              '&:hover': { backgroundColor: '#f6e7c1' },
              '&.Mui-disabled': {
                backgroundColor: 'rgba(226, 196, 143, 0.25)',
                color: palette.bone2,
              },
            },
          },
        ],
        styleOverrides: {
          root: { borderRadius: 4 },
          outlined: {
            borderColor: lineStrong,
            color: palette.bone,
            '&:hover': { borderColor: palette.gold, backgroundColor: goldHover },
          },
          text: {
            color: palette.bone2,
            '&:hover': { color: palette.goldHi, backgroundColor: goldHover },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            color: palette.bone2,
            '&:hover': { color: palette.goldHi, backgroundColor: goldHover },
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: palette.night,
            '& .MuiOutlinedInput-notchedOutline': { borderColor: lineStrong },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: palette.gold },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: palette.goldHi,
              borderWidth: 1,
            },
            '&.Mui-focused': { boxShadow: '0 0 0 3px rgba(226, 196, 143, 0.15)' },
            '&.Mui-error .MuiOutlinedInput-notchedOutline': { borderColor: '#e06060' },
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: { color: palette.bone2, '&.Mui-focused': { color: palette.goldHi } },
        },
      },
      MuiFormHelperText: { styleOverrides: { root: { color: palette.bone2 } } },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 3, fontWeight: 600 },
          outlined: { borderColor: lineStrong },
        },
        variants: [
          {
            props: { variant: 'filled', color: 'success' },
            style: { backgroundColor: palette.moss, color: palette.bone },
          },
          {
            props: { variant: 'filled', color: 'warning' },
            style: { backgroundColor: palette.ember, color: palette.night },
          },
          {
            props: { variant: 'filled', color: 'error' },
            style: { backgroundColor: palette.blood, color: '#f6dcc8' },
          },
        ],
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: palette.night,
            border: `1px solid ${lineStrong}`,
            color: palette.bone,
            fontSize: '0.875rem',
          },
          arrow: { color: palette.night },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: { border: '1px solid', borderRadius: 4 },
        },
        variants: [
          {
            props: { severity: 'success', variant: 'standard' },
            style: {
              backgroundColor: 'rgba(44, 74, 62, 0.45)',
              borderColor: palette.moss,
              color: palette.bone,
            },
          },
          {
            props: { severity: 'warning', variant: 'standard' },
            style: {
              backgroundColor: 'rgba(224, 128, 62, 0.12)',
              borderColor: palette.ember,
              color: palette.bone,
            },
          },
          {
            props: { severity: 'error', variant: 'standard' },
            style: {
              backgroundColor: 'rgba(142, 43, 43, 0.25)',
              borderColor: palette.blood,
              color: palette.bone,
            },
          },
          {
            props: { severity: 'info', variant: 'standard' },
            style: { backgroundColor: goldTint, borderColor: palette.gold, color: palette.bone },
          },
        ],
      },
      MuiSwitch: {
        styleOverrides: {
          switchBase: {
            '&.Mui-checked': { color: palette.goldHi },
            '&.Mui-checked + .MuiSwitch-track': { backgroundColor: palette.gold, opacity: 0.7 },
          },
          track: { backgroundColor: lineStrong, opacity: 1 },
        },
      },
      MuiCheckbox: {
        styleOverrides: { root: { color: lineStrong, '&.Mui-checked': { color: palette.goldHi } } },
      },
      MuiRadio: {
        styleOverrides: { root: { color: lineStrong, '&.Mui-checked': { color: palette.goldHi } } },
      },
      MuiTabs: { styleOverrides: { indicator: { backgroundColor: palette.goldHi } } },
      MuiTab: {
        styleOverrides: {
          root: {
            fontFamily: headingFont,
            fontWeight: 700,
            textTransform: 'none',
            '&.Mui-selected': { color: palette.goldHi },
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            borderColor: lineStrong,
            color: palette.bone2,
            textTransform: 'none',
            '&.Mui-selected': { backgroundColor: goldTint, color: palette.goldHi },
            '&.Mui-selected:hover': { backgroundColor: 'rgba(181, 148, 106, 0.2)' },
          },
        },
      },
      MuiPaginationItem: {
        styleOverrides: {
          root: {
            '&.Mui-selected': {
              backgroundColor: palette.goldHi,
              color: palette.ink,
              '&:hover': { backgroundColor: '#f6e7c1' },
            },
          },
        },
      },
      MuiMenu: {
        styleOverrides: { paper: { border: `1px solid ${lineStrong}`, boxShadow: popupShadow } },
      },
      MuiPopover: {
        styleOverrides: { paper: { border: `1px solid ${lineStrong}`, boxShadow: popupShadow } },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            '&:hover': { backgroundColor: goldHover },
            '&.Mui-selected': { backgroundColor: goldTint },
          },
        },
      },
      MuiSkeleton: { styleOverrides: { root: { backgroundColor: 'rgba(181, 148, 106, 0.1)' } } },
      // Bảng dữ liệu: header rêu đậm + chữ vàng (components.md 2.10)
      MuiDataGrid: {
        styleOverrides: {
          root: {
            border: `1px solid ${line}`,
            borderRadius: 6,
            '--DataGrid-t-color-border-base': rowLine,
            '& .MuiDataGrid-columnHeaders, & .MuiDataGrid-columnHeader': {
              backgroundColor: palette.moss2,
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              fontFamily: headingFont,
              fontWeight: 700,
              fontSize: '1.05rem',
              color: palette.goldHi,
            },
            '& .MuiDataGrid-row:hover': { backgroundColor: goldHover },
            '& .MuiDataGrid-row.Mui-selected': { backgroundColor: goldTint },
            '& .MuiDataGrid-row.Mui-selected:hover': {
              backgroundColor: 'rgba(181, 148, 106, 0.18)',
            },
          },
          cell: { borderColor: rowLine },
          footerContainer: { borderColor: rowLine },
        },
      },
    },
  },
  viVN,
  dataGridViVN,
);
