-- Add CHECK constraints for status and street columns to prevent data pollution
ALTER TABLE public.traffic_reports
ADD CONSTRAINT valid_status CHECK (status IN ('stoi', 'toczy_sie', 'jedzie'));

ALTER TABLE public.traffic_reports
ADD CONSTRAINT valid_street CHECK (street IN (
  'Zwycięska', 'Grabiszyńska', 'Powstańców Śląskich', 'Legnicka', 
  'Bielany', 'Muchoborska', 'Kamienna', 'Osobowicka', 'Podwale', 
  'Ślężna', 'Krakowska', 'Strzegomska', 'Wrocławska', 'Armii Krajowej'
));

ALTER TABLE public.street_chat_messages
ADD CONSTRAINT valid_chat_street CHECK (street IN (
  'Zwycięska', 'Grabiszyńska', 'Powstańców Śląskich', 'Legnicka', 
  'Bielany', 'Muchoborska', 'Kamienna', 'Osobowicka', 'Podwale', 
  'Ślężna', 'Krakowska', 'Strzegomska', 'Wrocławska', 'Armii Krajowej'
));

ALTER TABLE public.street_chat_messages
ADD CONSTRAINT valid_message_length CHECK (char_length(message) > 0 AND char_length(message) <= 500);

-- Create rate limit tracking table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  action_type text NOT NULL,
  last_action_at timestamp with time zone NOT NULL DEFAULT now(),
  action_count integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on rate_limits table
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only edge functions can manage rate limits (using service role)
CREATE POLICY "Service role can manage rate limits"
ON public.rate_limits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create index for efficient rate limit lookups
CREATE INDEX idx_rate_limits_identifier_action ON public.rate_limits(identifier, action_type, last_action_at);

-- Update RLS policies to prevent direct inserts (force edge function usage)
DROP POLICY IF EXISTS "Anyone can insert traffic reports" ON public.traffic_reports;
DROP POLICY IF EXISTS "Anyone can insert chat messages" ON public.street_chat_messages;

-- Create restrictive policies that only allow service role (edge functions) to insert
CREATE POLICY "Only edge functions can insert traffic reports"
ON public.traffic_reports
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

CREATE POLICY "Only edge functions can insert chat messages"
ON public.street_chat_messages
FOR INSERT
TO authenticated, anon
WITH CHECK (false);