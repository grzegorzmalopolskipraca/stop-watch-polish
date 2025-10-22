-- Create traffic reports table
CREATE TABLE public.traffic_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  street TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('stoi', 'toczy_sie', 'jedzie')),
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_fingerprint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_traffic_reports_street_reported_at ON public.traffic_reports(street, reported_at DESC);
CREATE INDEX idx_traffic_reports_reported_at ON public.traffic_reports(reported_at DESC);

-- Enable Row Level Security
ALTER TABLE public.traffic_reports ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read traffic reports (public data)
CREATE POLICY "Anyone can view traffic reports"
  ON public.traffic_reports
  FOR SELECT
  USING (true);

-- Allow anyone to insert traffic reports (community-driven)
CREATE POLICY "Anyone can insert traffic reports"
  ON public.traffic_reports
  FOR INSERT
  WITH CHECK (true);

-- Enable realtime for traffic reports
ALTER PUBLICATION supabase_realtime ADD TABLE public.traffic_reports;