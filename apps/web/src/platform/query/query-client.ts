import { QueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

export function shouldRetryQuery(failureCount: number, error: unknown) {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status && status >= 400 && status < 500) return false;
  }
  return failureCount < 2;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: shouldRetryQuery },
  },
});
