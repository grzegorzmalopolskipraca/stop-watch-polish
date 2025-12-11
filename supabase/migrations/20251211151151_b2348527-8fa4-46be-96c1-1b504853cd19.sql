-- Add GPS coordinate columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS home_lat double precision,
ADD COLUMN IF NOT EXISTS home_lng double precision,
ADD COLUMN IF NOT EXISTS work_lat double precision,
ADD COLUMN IF NOT EXISTS work_lng double precision;