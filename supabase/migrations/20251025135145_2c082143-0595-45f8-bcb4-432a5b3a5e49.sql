-- Create street_votes table
CREATE TABLE IF NOT EXISTS public.street_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  street_name TEXT NOT NULL,
  votes INTEGER DEFAULT 1,
  voter_ips JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_street_votes_street_name ON public.street_votes(street_name);

-- Enable RLS
ALTER TABLE public.street_votes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read votes
CREATE POLICY "Anyone can view street votes"
  ON public.street_votes
  FOR SELECT
  USING (true);

-- Allow anyone to insert/update votes (we'll handle IP validation in the app)
CREATE POLICY "Anyone can vote for streets"
  ON public.street_votes
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_street_votes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_street_votes_updated_at
  BEFORE UPDATE ON public.street_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_street_votes_updated_at();