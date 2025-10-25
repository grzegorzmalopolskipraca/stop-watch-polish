-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Anyone can vote for streets" ON street_votes;

-- Create new policy for only edge functions to insert/update
CREATE POLICY "Only edge functions can manage street votes"
ON street_votes
FOR ALL
USING (false)
WITH CHECK (false);