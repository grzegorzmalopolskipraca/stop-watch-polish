-- Create table to permanently cache street distances
CREATE TABLE IF NOT EXISTS public.street_distances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  street TEXT NOT NULL,
  direction TEXT NOT NULL,
  origin_lat DOUBLE PRECISION NOT NULL,
  origin_lng DOUBLE PRECISION NOT NULL,
  destination_lat DOUBLE PRECISION NOT NULL,
  destination_lng DOUBLE PRECISION NOT NULL,
  distance_meters INTEGER NOT NULL,
  route_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_street_distances_route_key ON public.street_distances(route_key);
CREATE INDEX idx_street_distances_street_direction ON public.street_distances(street, direction);

-- Enable RLS
ALTER TABLE public.street_distances ENABLE ROW LEVEL SECURITY;

-- Allow public read access (distances are not sensitive data)
CREATE POLICY "Anyone can read street distances"
  ON public.street_distances
  FOR SELECT
  USING (true);

-- Only allow system to insert/update (via service role key)
CREATE POLICY "Service role can manage street distances"
  ON public.street_distances
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create trigger for updated_at
CREATE TRIGGER update_street_distances_updated_at
  BEFORE UPDATE ON public.street_distances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_street_votes_updated_at();