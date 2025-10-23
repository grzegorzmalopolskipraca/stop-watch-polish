-- Drop the old constraint that's missing 'Grota Roweckiego'
ALTER TABLE traffic_reports DROP CONSTRAINT IF EXISTS valid_street;

-- Add the updated constraint with all streets including 'Grota Roweckiego'
ALTER TABLE traffic_reports ADD CONSTRAINT valid_street 
CHECK (street IN (
  'Zwycięska', 
  'Ołtaszyńska', 
  'Karkonoska', 
  'Ślężna',
  'Powstańców Śląskich', 
  'Grabiszyńska', 
  'Borowska', 
  'Buforowa',
  'Grota Roweckiego'
));