-- Create table for auto traffic monitoring settings
CREATE TABLE IF NOT EXISTS public.auto_traffic_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interval_minutes integer NOT NULL DEFAULT 15,
  last_run_at timestamp with time zone,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.auto_traffic_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read settings
CREATE POLICY "Anyone can view auto traffic settings"
ON public.auto_traffic_settings
FOR SELECT
USING (true);

-- Allow service role to manage settings
CREATE POLICY "Service role can manage auto traffic settings"
ON public.auto_traffic_settings
FOR ALL
USING (true)
WITH CHECK (true);

-- Insert default settings
INSERT INTO public.auto_traffic_settings (interval_minutes, is_enabled)
VALUES (15, true)
ON CONFLICT DO NOTHING;