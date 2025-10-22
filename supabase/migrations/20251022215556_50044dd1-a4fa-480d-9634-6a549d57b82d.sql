-- Add direction column to traffic_reports table
ALTER TABLE traffic_reports 
ADD COLUMN direction text NOT NULL DEFAULT 'to_center' 
CHECK (direction IN ('to_center', 'from_center'));

-- Add index for better query performance
CREATE INDEX idx_traffic_reports_direction ON traffic_reports(direction);

-- Add index for street and direction combination
CREATE INDEX idx_traffic_reports_street_direction ON traffic_reports(street, direction);