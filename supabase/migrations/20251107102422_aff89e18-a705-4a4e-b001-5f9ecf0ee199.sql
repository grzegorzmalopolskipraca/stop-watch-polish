-- Create locations table
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  street TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create coupons table
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  local_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  local_name TEXT NOT NULL,
  image_link TEXT,
  time_from TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  time_to TIMESTAMP WITH TIME ZONE,
  discount INTEGER NOT NULL CHECK (discount >= 1 AND discount <= 100),
  status TEXT DEFAULT 'empty' NOT NULL CHECK (status IN ('empty', 'active', 'used', 'redeemed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS on both tables
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- RLS policies for locations (anyone can view, authenticated users can manage)
CREATE POLICY "Anyone can view locations"
  ON public.locations
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can manage locations"
  ON public.locations
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS policies for coupons (anyone can view, authenticated users can manage)
CREATE POLICY "Anyone can view coupons"
  ON public.coupons
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can manage coupons"
  ON public.coupons
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create function to auto-update time_to when status changes to 'used'
CREATE OR REPLACE FUNCTION public.auto_set_time_to()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'used' AND OLD.status != 'used' AND NEW.time_to IS NULL THEN
    NEW.time_to = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for auto-updating time_to
CREATE TRIGGER update_coupon_time_to
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_set_time_to();