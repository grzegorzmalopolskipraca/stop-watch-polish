-- Enable RLS on traffic_cache table
-- This table is only accessed by edge functions with service role key,
-- so no additional policies are needed - only service role can access it
ALTER TABLE public.traffic_cache ENABLE ROW LEVEL SECURITY;