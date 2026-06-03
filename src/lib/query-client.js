import { QueryClient } from '@tanstack/react-query';

export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,        // data stays fresh for 30s — no redundant refetches
      gcTime: 5 * 60_000,       // keep unused data in cache for 5 min
      refetchOnMount: false,    // use cache on re-mount if data is fresh
    },
  },
});