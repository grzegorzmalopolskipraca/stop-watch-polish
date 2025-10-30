-- Create table for carpooling idea votes
CREATE TABLE IF NOT EXISTS public.carpooling_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  vote_count INTEGER NOT NULL DEFAULT 1,
  voter_fingerprints TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.carpooling_votes ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to read carpooling votes
CREATE POLICY "Anyone can view carpooling votes"
ON public.carpooling_votes
FOR SELECT
USING (true);

-- Create policy to allow anyone to insert carpooling votes (handled by edge function)
CREATE POLICY "Anyone can insert carpooling votes"
ON public.carpooling_votes
FOR INSERT
WITH CHECK (true);

-- Create policy to allow anyone to update carpooling votes (handled by edge function)
CREATE POLICY "Anyone can update carpooling votes"
ON public.carpooling_votes
FOR UPDATE
USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_carpooling_votes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_carpooling_votes_updated_at
BEFORE UPDATE ON public.carpooling_votes
FOR EACH ROW
EXECUTE FUNCTION public.update_carpooling_votes_updated_at();

-- Enable realtime for carpooling_votes table
ALTER PUBLICATION supabase_realtime ADD TABLE public.carpooling_votes;

-- Insert the three predefined carpooling ideas
INSERT INTO public.carpooling_votes (title, vote_count, voter_fingerprints)
VALUES 
  ('Wspólne przejazdy do pracy - 50% mniej kosztów paliwa i samochodów na drodze', 0, '{}'),
  ('AutoStop sąsiedzki - Gdy uciekł Ci autobus', 0, '{}'),
  ('Dowóz dzieci do szkoły na zmianę z sąsiadką', 0, '{}')
ON CONFLICT (title) DO NOTHING;