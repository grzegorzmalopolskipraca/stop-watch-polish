-- Fix search_path for update function by dropping trigger first
DROP TRIGGER IF EXISTS update_daily_speed_stats_timestamp ON public.daily_speed_stats;
DROP FUNCTION IF EXISTS update_daily_speed_stats_updated_at();

CREATE OR REPLACE FUNCTION update_daily_speed_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- Recreate the trigger
CREATE TRIGGER update_daily_speed_stats_timestamp
BEFORE UPDATE ON public.daily_speed_stats
FOR EACH ROW
EXECUTE FUNCTION update_daily_speed_stats_updated_at();