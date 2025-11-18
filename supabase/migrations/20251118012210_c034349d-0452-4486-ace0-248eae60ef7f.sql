-- Add speed column to traffic_reports table
ALTER TABLE traffic_reports 
ADD COLUMN speed numeric;

COMMENT ON COLUMN traffic_reports.speed IS 'Average speed in km/h used to determine traffic status';