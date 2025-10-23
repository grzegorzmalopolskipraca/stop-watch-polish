-- Create a new table for daily visit statistics
CREATE TABLE public.daily_visit_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visit_date DATE NOT NULL UNIQUE,
  visit_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.daily_visit_stats ENABLE ROW LEVEL SECURITY;

-- Create policy for anyone to view stats
CREATE POLICY "Anyone can view daily visit stats"
  ON public.daily_visit_stats
  FOR SELECT
  USING (true);

-- Create policy for service role to manage stats
CREATE POLICY "Service role can manage daily visit stats"
  ON public.daily_visit_stats
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Drop the old page_visits table since we're changing the tracking logic
DROP TABLE IF EXISTS public.page_visits CASCADE;

-- Create index on visit_date for faster lookups
CREATE INDEX idx_daily_visit_stats_date ON public.daily_visit_stats(visit_date);