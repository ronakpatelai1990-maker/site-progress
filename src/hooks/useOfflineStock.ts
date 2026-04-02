import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// ============================================================
// src/hooks/useOfflineStock.ts
//
// Drop-in replacement for however you currently fetch stock
// items. Replace your existing stock fetch with this hook.
// ============================================================

export interface StockItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unit_cost?: number;
  supplier?: string;
  status?: "in_stock" | "low" | "out";
  project_id?: string;
  created_at?: string;
  updated_at?: string;
}

export function useOfflineStock(projectId?: string) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const queryClient = useQueryClient();

  // Track online/offline
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const query = useQuery({
    queryKey: ["stock-items", projectId],
    queryFn: async (): Promise<StockItem[]> => {
      // Replace "stock_items" with your actual Supabase table name
      let q = supabase.from("stock_items").select("*").order("name");
      if (projectId) {
        q = q.eq("project_id", projectId);
      }
      const { data, error } = await q;
      if (error) throw error;
      setLastSynced(new Date());
      return (data as StockItem[]) ?? [];
    },
    // Keep data fresh for 5 minutes
    staleTime: 1000 * 60 * 5,
    // Keep in cache for 24 hours so it survives page refresh offline
    gcTime: 1000 * 60 * 60 * 24,
    // Always try to refetch when coming back online
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    // Don't throw when offline — return cached data silently
    retry: isOnline ? 3 : 0,
  });

  // When coming back online, invalidate and refetch
  useEffect(() => {
    if (isOnline) {
      queryClient.invalidateQueries({ queryKey: ["stock-items"] });
    }
  }, [isOnline, queryClient]);

  const isShowingCachedData =
    !isOnline && query.data !== undefined && !query.isFetching;

  const lastSyncedLabel = lastSynced
    ? `Last synced: ${lastSynced.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`
    : "Not yet synced";

  return {
    stockItems: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isShowingCachedData,
    isOnline,
    lastSyncedLabel,
    refetch: query.refetch,
  };
}
