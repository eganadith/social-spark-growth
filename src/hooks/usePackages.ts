import { useQuery } from "@tanstack/react-query";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import type { DbPackage, Platform } from "@/types/database";

export function usePackages(platform: Platform | "") {
  return useQuery({
    queryKey: ["packages", platform],
    enabled: Boolean(platform) && isSupabaseConfigured,
    queryFn: async (): Promise<DbPackage[]> => {
      const sb = getSupabase();
      const { data, error } = await sb
        .from("packages")
        .select("id, platform, name, followers, price, popular, premium")
        .eq("platform", platform)
        .order("price", { ascending: true });
      if (error) {
        const msg = [error.message, error.hint, error.details].filter(Boolean).join(" — ");
        throw new Error(msg || "Unknown Supabase error");
      }
      return (data ?? []) as DbPackage[];
    },
  });
}
