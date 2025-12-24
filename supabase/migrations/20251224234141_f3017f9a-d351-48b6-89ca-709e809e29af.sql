-- Add traffic_api_preference column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS traffic_api_preference TEXT DEFAULT 'distance_matrix_pessimistic';

COMMENT ON COLUMN public.profiles.traffic_api_preference IS 'Preferred traffic API: distance_matrix_optimistic, distance_matrix_best_guess, distance_matrix_pessimistic, routes_api';