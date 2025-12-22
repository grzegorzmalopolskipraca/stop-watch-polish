-- Create errors table for logging service errors
CREATE TABLE public.service_errors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  service_name TEXT NOT NULL,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_details JSONB,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.service_errors ENABLE ROW LEVEL SECURITY;

-- Anyone can view errors
CREATE POLICY "Anyone can view service errors" 
ON public.service_errors 
FOR SELECT 
USING (true);

-- Service role can manage errors
CREATE POLICY "Service role can manage service errors" 
ON public.service_errors 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_service_errors_service_name ON public.service_errors(service_name);
CREATE INDEX idx_service_errors_created_at ON public.service_errors(created_at DESC);