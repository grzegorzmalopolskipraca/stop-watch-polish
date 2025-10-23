-- Drop the constraint that's missing 'Radosna' and 'Sudecka'
ALTER TABLE traffic_reports DROP CONSTRAINT IF EXISTS valid_street;

-- Add the complete constraint with all streets
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
  'Grota Roweckiego',
  'Radosna',
  'Sudecka'
));