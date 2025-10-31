-- Create table for RSS ticker settings
CREATE TABLE IF NOT EXISTS public.rss_ticker_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  speed integer NOT NULL DEFAULT 60,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rss_ticker_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for rss_ticker_settings
CREATE POLICY "Anyone can view RSS ticker settings" 
ON public.rss_ticker_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can manage RSS ticker settings" 
ON public.rss_ticker_settings 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Insert default settings if not exists
INSERT INTO public.rss_ticker_settings (speed)
SELECT 60
WHERE NOT EXISTS (SELECT 1 FROM public.rss_ticker_settings);

-- Create trigger for updated_at
CREATE TRIGGER update_rss_ticker_settings_updated_at
BEFORE UPDATE ON public.rss_ticker_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_rss_items_updated_at();