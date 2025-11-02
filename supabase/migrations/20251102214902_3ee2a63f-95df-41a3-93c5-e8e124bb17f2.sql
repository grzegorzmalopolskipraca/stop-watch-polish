-- Create traffic_cache table for caching Google Maps API responses
CREATE TABLE IF NOT EXISTS public.traffic_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  route_key TEXT NOT NULL UNIQUE,
  origin_lat DOUBLE PRECISION NOT NULL,
  origin_lng DOUBLE PRECISION NOT NULL,
  destination_lat DOUBLE PRECISION NOT NULL,
  destination_lng DOUBLE PRECISION NOT NULL,
  traffic_data JSONB NOT NULL,
  cached_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index on route_key for fast lookups
CREATE INDEX IF NOT EXISTS idx_traffic_cache_route_key ON public.traffic_cache(route_key);

-- Create index on cached_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_traffic_cache_cached_at ON public.traffic_cache(cached_at);

-- No RLS needed - this table is only accessed by edge functions with service role key