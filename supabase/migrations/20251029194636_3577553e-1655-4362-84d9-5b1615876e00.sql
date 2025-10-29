-- Create table for tracking daily min/max speeds per street and direction
CREATE TABLE IF NOT EXISTS public.daily_speed_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  street TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('to_center', 'from_center')),
  speed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  min_speed NUMERIC(5,2) NOT NULL,
  max_speed NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(street, direction, speed_date)
);

-- Enable RLS
ALTER TABLE public.daily_speed_stats ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view speed stats
CREATE POLICY "Anyone can view speed stats"
ON public.daily_speed_stats
FOR SELECT
USING (true);

-- Allow anyone to insert/update speed stats
CREATE POLICY "Anyone can manage speed stats"
ON public.daily_speed_stats
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_daily_speed_stats_lookup 
ON public.daily_speed_stats(street, direction, speed_date);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_daily_speed_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_daily_speed_stats_timestamp
BEFORE UPDATE ON public.daily_speed_stats
FOR EACH ROW
EXECUTE FUNCTION update_daily_speed_stats_updated_at();