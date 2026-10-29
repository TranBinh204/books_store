/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import type { ReactNode } from 'react';

declare global {
  type PageProps<T extends string = string> = {
    params: Promise<Record<string, any>>;
    searchParams: Promise<Record<string, any>>;
  };

  type LayoutProps<T extends string = string> = {
    children: ReactNode;
    params?: Promise<Record<string, any>>;
  };
}
