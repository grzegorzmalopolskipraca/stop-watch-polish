-- Give public pages aggregate vote and city traffic data without exposing
-- the anonymous fingerprints stored in street_votes.voter_ips.
DROP POLICY IF EXISTS "Anyone can view street votes" ON public.street_votes;
REVOKE SELECT ON TABLE public.street_votes FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_wroclaw_seo_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH report_window AS (
    SELECT
      street,
      status,
      reported_at,
      EXTRACT(HOUR FROM reported_at AT TIME ZONE 'Europe/Warsaw')::integer AS local_hour
    FROM public.traffic_reports
    WHERE reported_at >= now() - interval '12 months'
  ), traffic_summary AS (
    SELECT
      COUNT(*)::integer AS report_count,
      COUNT(*) FILTER (WHERE status IN ('toczy_sie', 'stoi'))::integer AS slow_report_count,
      COUNT(DISTINCT street)::integer AS monitored_street_count
    FROM report_window
  ), traffic_periods AS (
    SELECT
      CASE
        WHEN local_hour < 6 THEN '00:00–05:59'
        WHEN local_hour < 10 THEN '06:00–09:59'
        WHEN local_hour < 14 THEN '10:00–13:59'
        WHEN local_hour < 18 THEN '14:00–17:59'
        WHEN local_hour < 22 THEN '18:00–21:59'
        ELSE '22:00–23:59'
      END AS period,
      COUNT(*)::integer AS sample_count,
      COUNT(*) FILTER (WHERE status IN ('toczy_sie', 'stoi'))::integer AS slow_report_count
    FROM report_window
    GROUP BY 1
    HAVING COUNT(*) >= 10
  ), traffic_streets AS (
    SELECT
      street,
      COUNT(*)::integer AS sample_count,
      COUNT(*) FILTER (WHERE status IN ('toczy_sie', 'stoi'))::integer AS slow_report_count,
      MAX(reported_at) AS last_reported_at
    FROM report_window
    GROUP BY street
    HAVING COUNT(*) >= 20
  ), incident_summary AS (
    SELECT
      COUNT(*)::integer AS report_count,
      COUNT(*) FILTER (WHERE reported_at >= now() - interval '30 days')::integer AS recent_report_count
    FROM public.incident_reports
    WHERE reported_at >= now() - interval '12 months'
  ), incident_types AS (
    SELECT incident_type, COUNT(*)::integer AS report_count
    FROM public.incident_reports
    WHERE reported_at >= now() - interval '12 months'
    GROUP BY incident_type
  ), vote_rows AS (
    SELECT street_name, votes, updated_at
    FROM public.street_votes
    WHERE votes > 0
  )
  SELECT jsonb_build_object(
    'generated_at', now(),
    'period_start', now() - interval '12 months',
    'traffic', jsonb_build_object(
      'report_count', traffic_summary.report_count,
      'slow_report_count', traffic_summary.slow_report_count,
      'slow_share_percent', CASE
        WHEN traffic_summary.report_count = 0 THEN 0
        ELSE ROUND(100.0 * traffic_summary.slow_report_count / traffic_summary.report_count, 1)
      END,
      'monitored_street_count', traffic_summary.monitored_street_count,
      'peak_periods', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'period', period,
            'sample_count', sample_count,
            'slow_report_count', slow_report_count,
            'slow_share_percent', ROUND(100.0 * slow_report_count / sample_count, 1)
          )
          ORDER BY slow_report_count::numeric / sample_count DESC, sample_count DESC
        )
        FROM traffic_periods
      ), '[]'::jsonb),
      'streets_with_most_slow_reports', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'street', street,
            'sample_count', sample_count,
            'slow_report_count', slow_report_count,
            'slow_share_percent', ROUND(100.0 * slow_report_count / sample_count, 1),
            'last_reported_at', last_reported_at
          )
          ORDER BY slow_report_count::numeric / sample_count DESC, slow_report_count DESC
        )
        FROM (
          SELECT * FROM traffic_streets
          ORDER BY slow_report_count::numeric / sample_count DESC, slow_report_count DESC
          LIMIT 5
        ) AS top_traffic_streets
      ), '[]'::jsonb)
    ),
    'incidents', jsonb_build_object(
      'report_count_12_months', incident_summary.report_count,
      'report_count_30_days', incident_summary.recent_report_count,
      'by_type', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object('type', incident_type, 'report_count', report_count)
          ORDER BY report_count DESC, incident_type
        )
        FROM incident_types
      ), '[]'::jsonb)
    ),
    'votes', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object('street_name', street_name, 'votes', votes)
        ORDER BY votes DESC, updated_at DESC, street_name
      )
      FROM vote_rows
    ), '[]'::jsonb),
    'last_reported_at', (
      SELECT MAX(reported_at)
      FROM (
        SELECT MAX(reported_at) AS reported_at FROM public.traffic_reports
        UNION ALL
        SELECT MAX(reported_at) AS reported_at FROM public.incident_reports
      ) AS latest_reports
    )
  )
  FROM traffic_summary, incident_summary;
$$;

CREATE OR REPLACE FUNCTION public.get_public_street_votes()
RETURNS TABLE(street_name text, votes integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT vote.street_name, vote.votes
  FROM public.street_votes AS vote
  WHERE vote.votes > 0
  ORDER BY vote.votes DESC, vote.updated_at DESC, vote.street_name
$$;

REVOKE ALL ON FUNCTION public.get_wroclaw_seo_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_street_votes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_wroclaw_seo_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_street_votes() TO anon, authenticated;
