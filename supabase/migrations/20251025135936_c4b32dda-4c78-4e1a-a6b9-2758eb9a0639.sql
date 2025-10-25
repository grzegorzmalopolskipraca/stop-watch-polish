-- Create city_votes table
CREATE TABLE IF NOT EXISTS public.city_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_name TEXT NOT NULL,
  votes INTEGER DEFAULT 1,
  voter_ips JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_city_votes_city_name ON public.city_votes(city_name);

-- Enable RLS
ALTER TABLE public.city_votes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read votes
CREATE POLICY "Anyone can view city votes"
  ON public.city_votes
  FOR SELECT
  USING (true);

-- Allow anyone to insert/update votes
CREATE POLICY "Anyone can vote for cities"
  ON public.city_votes
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_city_votes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for updated_at
CREATE TRIGGER update_city_votes_updated_at
  BEFORE UPDATE ON public.city_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_city_votes_updated_at();