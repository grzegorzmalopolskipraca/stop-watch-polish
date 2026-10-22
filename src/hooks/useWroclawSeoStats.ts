import { useQuery } from "@tanstack/react-query";
import { WROCLAW_SEO_STATS_QUERY_KEY } from "@/hooks/useStreetVotes";

type TrafficPeriod = {
  period: string;
  sample_count: number;
  slow_report_count: number;
  slow_share_percent: number;
};
type TrafficStreet = {
  street: string;
  sample_count: number;
  slow_report_count: number;
  slow_share_percent: number;
};
export type WroclawSeoStats = {
  generated_at: string;
  last_reported_at: string | null;
  traffic: {
    report_count: number;
    slow_report_count: number;
    slow_share_percent: number;
    monitored_street_count: number;
    peak_periods: TrafficPeriod[];
    streets_with_most_slow_reports: TrafficStreet[];
  };
  incidents: {
    report_count_12_months: number;
    report_count_30_days: number;
    by_type: { type: string; report_count: number }[];
  };
  votes: { street_name: string; votes: number }[];
};

export function useWroclawSeoStats(enabled = true) {
  return useQuery({
    queryKey: WROCLAW_SEO_STATS_QUERY_KEY,
    enabled,
    queryFn: async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.rpc("get_wroclaw_seo_stats");
      if (error) throw error;
      return data as unknown as WroclawSeoStats;
    },
    staleTime: 30 * 60 * 1000,
  });
}
