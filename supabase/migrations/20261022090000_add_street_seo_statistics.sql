-- Aggregate the existing public reports for street landing pages. This keeps
-- page visits independent from TomTom and returns chart-ready data in one call.
CREATE INDEX IF NOT EXISTS idx_incident_reports_street_reported_at
  ON public.incident_reports (street, reported_at DESC);

CREATE OR REPLACE FUNCTION public.get_street_seo_stats(p_street text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $function$
WITH clock AS (
  SELECT
    timezone('Europe/Warsaw', now()) AS local_now,
    date_trunc('month', timezone('Europe/Warsaw', now()))::date AS current_month,
    date_trunc('year', timezone('Europe/Warsaw', now()))::date AS current_year
),
traffic_all AS (
  SELECT street, status, direction, speed, reported_at
  FROM public.traffic_reports
  WHERE street = p_street
),
traffic_recent AS (
  SELECT
    t.status,
    t.direction,
    t.speed,
    t.reported_at,
    timezone('Europe/Warsaw', t.reported_at) AS local_reported_at
  FROM traffic_all t
  CROSS JOIN clock c
  WHERE t.reported_at >= (c.local_now - interval '12 months') AT TIME ZONE 'Europe/Warsaw'
),
incidents_all AS (
  SELECT street, incident_type, direction, reported_at
  FROM public.incident_reports
  WHERE street = p_street
),
incidents_recent AS (
  SELECT
    i.incident_type,
    i.direction,
    i.reported_at,
    timezone('Europe/Warsaw', i.reported_at) AS local_reported_at
  FROM incidents_all i
  CROSS JOIN clock c
  WHERE i.reported_at >= (c.local_now - interval '12 months') AT TIME ZONE 'Europe/Warsaw'
),
months AS (
  SELECT month_series.month_start::date AS month_start
  FROM clock c,
       generate_series(c.current_month - interval '11 months', c.current_month, interval '1 month') AS month_series(month_start)
),
years AS (
  SELECT generate_series(
    extract(year FROM c.current_year)::integer - 2,
    extract(year FROM c.current_year)::integer
  ) AS report_year
  FROM clock c
),
traffic_by_hour AS (
  SELECT
    (extract(hour FROM local_reported_at)::integer / 4) AS bucket,
    count(*)::integer AS report_count
  FROM traffic_recent
  GROUP BY 1
),
statuses AS (
  SELECT status_series.status, CASE status_series.status WHEN 'jedzie' THEN 'Ruch płynny' WHEN 'toczy_sie' THEN 'Ruch spowolniony' ELSE 'Zator / postój' END AS label
  FROM unnest(ARRAY['jedzie', 'toczy_sie', 'stoi']::text[]) AS status_series(status)
),
hour_buckets AS (
  SELECT bucket_series.bucket, format('%s–%s', lpad((bucket_series.bucket * 4)::text, 2, '0'), lpad((bucket_series.bucket * 4 + 3)::text, 2, '0')) AS label
  FROM generate_series(0, 5) AS bucket_series(bucket)
),
weekdays AS (
  SELECT day_series.weekday, CASE day_series.weekday WHEN 1 THEN 'Pon' WHEN 2 THEN 'Wt' WHEN 3 THEN 'Śr' WHEN 4 THEN 'Czw' WHEN 5 THEN 'Pt' WHEN 6 THEN 'Sob' ELSE 'Ndz' END AS label
  FROM generate_series(1, 7) AS day_series(weekday)
)
SELECT jsonb_build_object(
  'traffic_total', (SELECT count(*)::integer FROM traffic_all),
  'traffic_12_months', (SELECT count(*)::integer FROM traffic_recent),
  'incidents_total', (SELECT count(*)::integer FROM incidents_all),
  'incidents_12_months', (SELECT count(*)::integer FROM incidents_recent),
  'last_traffic_report', (
    SELECT jsonb_build_object(
      'status', t.status,
      'direction', t.direction,
      'speed', t.speed,
      'reported_at', t.reported_at
    )
    FROM traffic_all t
    ORDER BY t.reported_at DESC
    LIMIT 1
  ),
  'traffic_by_weekday', COALESCE((
    SELECT jsonb_agg(jsonb_build_object('label', w.label, 'count', COALESCE(t.report_count, 0)) ORDER BY w.weekday)
    FROM weekdays w
    LEFT JOIN (
      SELECT extract(isodow FROM local_reported_at)::integer AS weekday, count(*)::integer AS report_count
      FROM traffic_recent
      GROUP BY 1
    ) t USING (weekday)
  ), '[]'::jsonb),
  'traffic_by_month', COALESCE((
    SELECT jsonb_agg(jsonb_build_object('label', to_char(m.month_start, 'YYYY-MM'), 'count', COALESCE(t.report_count, 0)) ORDER BY m.month_start)
    FROM months m
    LEFT JOIN (
      SELECT date_trunc('month', local_reported_at)::date AS month_start, count(*)::integer AS report_count
      FROM traffic_recent
      GROUP BY 1
    ) t USING (month_start)
  ), '[]'::jsonb),
  'traffic_by_year', COALESCE((
    SELECT jsonb_agg(jsonb_build_object('label', y.report_year::text, 'count', COALESCE(t.report_count, 0)) ORDER BY y.report_year)
    FROM years y
    LEFT JOIN (
      SELECT extract(year FROM timezone('Europe/Warsaw', reported_at))::integer AS report_year, count(*)::integer AS report_count
      FROM traffic_all
      GROUP BY 1
    ) t USING (report_year)
  ), '[]'::jsonb),
  'traffic_by_time_of_day', COALESCE((
    SELECT jsonb_agg(jsonb_build_object('label', h.label, 'count', COALESCE(t.report_count, 0)) ORDER BY h.bucket)
    FROM hour_buckets h
    LEFT JOIN traffic_by_hour t USING (bucket)
  ), '[]'::jsonb),
  'traffic_by_status', COALESCE((
    SELECT jsonb_agg(jsonb_build_object('label', s.label, 'count', COALESCE(t.report_count, 0)) ORDER BY s.status)
    FROM statuses s
    LEFT JOIN (
      SELECT status, count(*)::integer AS report_count
      FROM traffic_recent
      GROUP BY status
    ) t USING (status)
  ), '[]'::jsonb),
  'incidents_by_type', COALESCE((
    SELECT jsonb_agg(jsonb_build_object('label', incident_type, 'count', report_count) ORDER BY report_count DESC, incident_type)
    FROM (
      SELECT incident_type, count(*)::integer AS report_count
      FROM incidents_recent
      GROUP BY incident_type
    ) grouped_incidents
  ), '[]'::jsonb),
  'latest_incidents', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'incident_type', i.incident_type,
      'direction', i.direction,
      'reported_at', i.reported_at
    ) ORDER BY i.reported_at DESC)
    FROM (
      SELECT incident_type, direction, reported_at
      FROM incidents_all
      CROSS JOIN clock c
      WHERE reported_at >= (c.local_now - interval '30 days') AT TIME ZONE 'Europe/Warsaw'
      ORDER BY reported_at DESC
      LIMIT 5
    ) i
  ), '[]'::jsonb),
  'updated_at', now()
);
$function$;

REVOKE ALL ON FUNCTION public.get_street_seo_stats(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_street_seo_stats(text) TO anon, authenticated;
