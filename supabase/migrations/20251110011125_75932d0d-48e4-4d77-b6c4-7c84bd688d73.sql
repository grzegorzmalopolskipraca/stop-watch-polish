-- Add show_on_streets column to coupons table
ALTER TABLE public.coupons 
ADD COLUMN show_on_streets text;

-- Add comment to explain the column
COMMENT ON COLUMN public.coupons.show_on_streets IS 'Street name where this coupon should be shown. If NULL, coupon can be shown on all streets.';