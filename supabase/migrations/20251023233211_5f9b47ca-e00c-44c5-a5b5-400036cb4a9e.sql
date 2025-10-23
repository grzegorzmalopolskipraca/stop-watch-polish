-- Create a new table for total visit counter
CREATE TABLE public.total_visit_counter (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  total_visits INTEGER NOT NULL DEFAULT 5535,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.total_visit_counter ENABLE ROW LEVEL SECURITY;

-- Create policy for anyone to view the counter
CREATE POLICY "Anyone can view total visit counter"
  ON public.total_visit_counter
  FOR SELECT
  USING (true);

-- Create policy for service role to manage the counter
CREATE POLICY "Service role can manage total visit counter"
  ON public.total_visit_counter
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Insert the initial record with 5535 visits
INSERT INTO public.total_visit_counter (total_visits) VALUES (5535);