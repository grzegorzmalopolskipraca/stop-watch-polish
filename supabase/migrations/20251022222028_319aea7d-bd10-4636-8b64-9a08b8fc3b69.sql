-- Create page_visits table to track visitor statistics
CREATE TABLE IF NOT EXISTS public.page_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  street TEXT,
  user_fingerprint TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to view visit statistics
CREATE POLICY "Anyone can view page visits"
ON public.page_visits
FOR SELECT
USING (true);

-- Create policy for edge functions to insert visits
CREATE POLICY "Only edge functions can insert page visits"
ON public.page_visits
FOR INSERT
WITH CHECK (false);

-- Create index for faster queries
CREATE INDEX idx_page_visits_visited_at ON public.page_visits(visited_at);
CREATE INDEX idx_page_visits_street ON public.page_visits(street);