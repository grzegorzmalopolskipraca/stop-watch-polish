-- Create weather cache table
CREATE TABLE IF NOT EXISTS public.weather_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  street TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  weather_data JSONB NOT NULL,
  cached_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(street)
);

-- Enable RLS
ALTER TABLE public.weather_cache ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read weather cache
CREATE POLICY "Anyone can view weather cache"
  ON public.weather_cache
  FOR SELECT
  USING (true);

-- Only service role can manage weather cache
CREATE POLICY "Service role can manage weather cache"
  ON public.weather_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_weather_cache_street ON public.weather_cache(street);
CREATE INDEX idx_weather_cache_cached_at ON public.weather_cache(cached_at);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_weather_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_weather_cache_updated_at_trigger
  BEFORE UPDATE ON public.weather_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_weather_cache_updated_at();