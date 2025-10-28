-- Drop the old constraint that only allowed 11 streets
ALTER TABLE public.traffic_reports 
DROP CONSTRAINT IF EXISTS valid_street;

-- Add new constraint with all 13 streets
ALTER TABLE public.traffic_reports 
ADD CONSTRAINT valid_street 
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