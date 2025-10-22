-- Drop old constraints
ALTER TABLE public.traffic_reports DROP CONSTRAINT IF EXISTS valid_street;
ALTER TABLE public.street_chat_messages DROP CONSTRAINT IF EXISTS valid_chat_street;

-- Add new constraints with correct street list matching the UI
ALTER TABLE public.traffic_reports
ADD CONSTRAINT valid_street CHECK (street IN (
  'Zwycięska', 'Ołtaszyńska', 'Karkonoska', 'Ślężna', 
  'Powstańców Śląskich', 'Grabiszyńska', 'Borowska', 'Buforowa'
));

ALTER TABLE public.street_chat_messages
ADD CONSTRAINT valid_chat_street CHECK (street IN (
  'Zwycięska', 'Ołtaszyńska', 'Karkonoska', 'Ślężna', 
  'Powstańców Śląskich', 'Grabiszyńska', 'Borowska', 'Buforowa'
));