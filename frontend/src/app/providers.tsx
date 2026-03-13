import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, theme } from 'antd'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider
        theme={{
          algorithm: theme.darkAlgorithm,
          token: {
            colorPrimary: '#E6E6E6',
            colorBgBase: '#0A0A0A',
            colorBgContainer: '#141414',
            colorText: '#F2F2F2',
            colorTextSecondary: '#B8B8B8',
            colorBorder: '#242424',
            borderRadius: 8,
          },
        }}
      >
        {children}
      </ConfigProvider>
    </QueryClientProvider>
  )
}