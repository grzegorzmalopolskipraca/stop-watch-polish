-- Fix the function search path security issue
DROP TRIGGER IF EXISTS update_street_votes_updated_at ON public.street_votes;
DROP FUNCTION IF EXISTS update_street_votes_updated_at();

CREATE OR REPLACE FUNCTION update_street_votes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the trigger
CREATE TRIGGER update_street_votes_updated_at
  BEFORE UPDATE ON public.street_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_street_votes_updated_at();