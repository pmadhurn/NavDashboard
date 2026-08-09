import React from 'react';
import { ConfigProvider } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { buildAntdTheme } from '@/styles/theme';
import { useThemeStore } from '@/shared/stores/themeStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  // antd derives its own hover/active scales by parsing these colours, so it
  // needs a fresh config per mode — CSS variables alone would leave every
  // antd component dark while the rest of the app went light.
  const mode = useThemeStore((s) => s.mode);
  const antdTheme = React.useMemo(() => buildAntdTheme(mode), [mode]);

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={antdTheme}>
        {children}
      </ConfigProvider>
    </QueryClientProvider>
  );
}