-- Drop the old constraint that only allowed 8 streets
ALTER TABLE public.street_chat_messages 
DROP CONSTRAINT IF EXISTS valid_chat_street;

-- Add new constraint with all 13 streets
ALTER TABLE public.street_chat_messages 
ADD CONSTRAINT valid_chat_street 
CHECK (street = ANY (ARRAY[
  'Borowska'::text,
  'Buforowa'::text,
  'Grabiszyńska'::text,
  'Grota Roweckiego'::text,
  'Karkonoska'::text,
  'Ołtaszyńska'::text,
  'Opolska'::text,
  'Parafialna'::text,
  'Powstańców Śląskich'::text,
  'Radosna'::text,
  'Sudecka'::text,
  'Ślężna'::text,
  'Zwycięska'::text
]));