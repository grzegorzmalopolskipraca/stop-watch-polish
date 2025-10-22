-- Create a table for incident reports
CREATE TABLE public.incident_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  street TEXT NOT NULL,
  incident_type TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'to_center',
  user_fingerprint TEXT,
  reported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.incident_reports ENABLE ROW LEVEL SECURITY;

-- Create policies for incident reports
CREATE POLICY "Anyone can view incident reports" 
ON public.incident_reports 
FOR SELECT 
USING (true);

CREATE POLICY "Only edge functions can insert incident reports" 
ON public.incident_reports 
FOR INSERT 
WITH CHECK (false);

-- Create indexes for better performance
CREATE INDEX idx_incident_reports_street ON public.incident_reports(street);
CREATE INDEX idx_incident_reports_reported_at ON public.incident_reports(reported_at);
CREATE INDEX idx_incident_reports_street_direction ON public.incident_reports(street, direction);
CREATE INDEX idx_incident_reports_type ON public.incident_reports(incident_type);