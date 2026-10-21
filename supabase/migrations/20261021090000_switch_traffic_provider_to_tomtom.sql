-- Use TomTom for traffic and commute-time estimates across all existing profiles.
ALTER TABLE public.profiles
  ALTER COLUMN traffic_api_preference SET DEFAULT 'tomtom';

UPDATE public.profiles
SET traffic_api_preference = 'tomtom'
WHERE traffic_api_preference IS DISTINCT FROM 'tomtom';

COMMENT ON COLUMN public.profiles.traffic_api_preference IS
  'Traffic data provider. TomTom is used for all traffic and commute-time estimates.';

-- Existing rows contain Google traffic responses in a compatible shape; clear
-- them so the first request after deployment is fetched from TomTom.
DELETE FROM public.traffic_cache;
