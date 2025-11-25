-- Add weather data columns to traffic_reports table
ALTER TABLE public.traffic_reports
ADD COLUMN temperature NUMERIC,
ADD COLUMN weather_condition TEXT,
ADD COLUMN humidity NUMERIC,
ADD COLUMN wind_speed NUMERIC,
ADD COLUMN pressure NUMERIC,
ADD COLUMN visibility NUMERIC,
ADD COLUMN weather_cached_at TIMESTAMP WITH TIME ZONE;