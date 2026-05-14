import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Properly encode URL segments, especially for Hebrew and special characters
    const [base, ...segments] = queryKey as string[];
    const encodedUrl = [base, ...segments.map(segment => encodeURIComponent(segment))].join("/");
    const res = await fetch(encodedUrl, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
      staleTime: 1000 * 60 * 5, // 5 minutes - increased for better performance
      gcTime: 1000 * 60 * 10, // 10 minutes cleanup - increased for better caching
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx client errors (auth, not found, validation)
        const status = error?.message ? parseInt(error.message.split(':')[0]) : 0;
        if (status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      networkMode: 'always',
    },
    mutations: {
      retry: 1,
      networkMode: 'always',
      onSuccess: () => {
        // Efficient selective invalidation
        queryClient.invalidateQueries({ 
          queryKey: ['/api/admin/configs'],
          exact: false,
          refetchType: 'active'
        });
        queryClient.invalidateQueries({ 
          queryKey: ['/api/configs'],
          exact: false,
          refetchType: 'active'
        });
      },
    },
  },
});
