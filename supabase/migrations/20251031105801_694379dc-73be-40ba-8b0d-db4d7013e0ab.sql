-- Create RSS ticker items table
CREATE TABLE public.rss_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  text TEXT NOT NULL CHECK (char_length(text) <= 200),
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rss_items ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view RSS items
CREATE POLICY "Anyone can view rss items"
ON public.rss_items
FOR SELECT
USING (true);

-- Allow anyone to manage RSS items (insert, update, delete)
CREATE POLICY "Anyone can manage rss items"
ON public.rss_items
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for ordering
CREATE INDEX idx_rss_items_position ON public.rss_items(position);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_rss_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rss_items_updated_at
BEFORE UPDATE ON public.rss_items
FOR EACH ROW
EXECUTE FUNCTION public.update_rss_items_updated_at();