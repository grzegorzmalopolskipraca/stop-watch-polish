-- Create table to track service execution status
CREATE TABLE IF NOT EXISTS public.service_execution_status (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_name text NOT NULL UNIQUE,
  last_success_at timestamp with time zone,
  last_attempt_at timestamp with time zone,
  last_error_at timestamp with time zone,
  consecutive_failures integer DEFAULT 0,
  current_interval_minutes integer DEFAULT 10,
  is_healthy boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_execution_status ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view service status"
ON public.service_execution_status
FOR SELECT
USING (true);

CREATE POLICY "Service role can manage service status"
ON public.service_execution_status
FOR ALL
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_service_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_service_execution_status_updated_at
BEFORE UPDATE ON public.service_execution_status
FOR EACH ROW
EXECUTE FUNCTION public.update_service_status_updated_at();

-- Insert initial record for calculate-commute-times
INSERT INTO public.service_execution_status (service_name, current_interval_minutes, is_healthy)
VALUES ('calculate-commute-times', 10, true)
ON CONFLICT (service_name) DO NOTHING;