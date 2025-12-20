-- Create app_role enum for user roles (only if it doesn't exist)
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create user_roles table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable Row Level Security
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles table
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Drop existing policies on locations if they exist (more thorough cleanup)
DROP POLICY IF EXISTS "Anyone can view locations" ON public.locations;
DROP POLICY IF EXISTS "Admins can insert locations" ON public.locations;
DROP POLICY IF EXISTS "Admins can update locations" ON public.locations;
DROP POLICY IF EXISTS "Admins can delete locations" ON public.locations;

-- Allow public read access to locations
CREATE POLICY "Anyone can view locations"
ON public.locations
FOR SELECT
USING (true);

-- Only admins can modify locations
CREATE POLICY "Admins can insert locations"
ON public.locations
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update locations"
ON public.locations
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete locations"
ON public.locations
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Drop existing policies on coupons if they exist
DROP POLICY IF EXISTS "Anyone can view coupons" ON public.coupons;
DROP POLICY IF EXISTS "Admins can insert coupons" ON public.coupons;
DROP POLICY IF EXISTS "Admins can update coupons" ON public.coupons;
DROP POLICY IF EXISTS "Admins can delete coupons" ON public.coupons;

-- Allow public read access to coupons
CREATE POLICY "Anyone can view coupons"
ON public.coupons
FOR SELECT
USING (true);

-- Only admins can modify coupons
CREATE POLICY "Admins can insert coupons"
ON public.coupons
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update coupons"
ON public.coupons
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete coupons"
ON public.coupons
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Drop existing policies on rss_items if they exist
DROP POLICY IF EXISTS "Anyone can view rss_items" ON public.rss_items;
DROP POLICY IF EXISTS "Admins can insert rss_items" ON public.rss_items;
DROP POLICY IF EXISTS "Admins can update rss_items" ON public.rss_items;
DROP POLICY IF EXISTS "Admins can delete rss_items" ON public.rss_items;

CREATE POLICY "Anyone can view rss_items"
ON public.rss_items
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert rss_items"
ON public.rss_items
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update rss_items"
ON public.rss_items
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete rss_items"
ON public.rss_items
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Drop existing policies on rss_ticker_settings if they exist
DROP POLICY IF EXISTS "Anyone can view rss_ticker_settings" ON public.rss_ticker_settings;
DROP POLICY IF EXISTS "Admins can insert rss_ticker_settings" ON public.rss_ticker_settings;
DROP POLICY IF EXISTS "Admins can update rss_ticker_settings" ON public.rss_ticker_settings;
DROP POLICY IF EXISTS "Admins can delete rss_ticker_settings" ON public.rss_ticker_settings;

CREATE POLICY "Anyone can view rss_ticker_settings"
ON public.rss_ticker_settings
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert rss_ticker_settings"
ON public.rss_ticker_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update rss_ticker_settings"
ON public.rss_ticker_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete rss_ticker_settings"
ON public.rss_ticker_settings
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Drop existing policies on auto_traffic_settings if they exist
DROP POLICY IF EXISTS "Anyone can view auto_traffic_settings" ON public.auto_traffic_settings;
DROP POLICY IF EXISTS "Admins can insert auto_traffic_settings" ON public.auto_traffic_settings;
DROP POLICY IF EXISTS "Admins can update auto_traffic_settings" ON public.auto_traffic_settings;
DROP POLICY IF EXISTS "Admins can delete auto_traffic_settings" ON public.auto_traffic_settings;

CREATE POLICY "Anyone can view auto_traffic_settings"
ON public.auto_traffic_settings
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert auto_traffic_settings"
ON public.auto_traffic_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update auto_traffic_settings"
ON public.auto_traffic_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can delete auto_traffic_settings"
ON public.auto_traffic_settings
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Drop existing policies on rate_limits if they exist
DROP POLICY IF EXISTS "Anyone can view rate_limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Anyone can insert rate_limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Anyone can update rate_limits" ON public.rate_limits;
DROP POLICY IF EXISTS "Admins can delete rate_limits" ON public.rate_limits;

CREATE POLICY "Anyone can view rate_limits"
ON public.rate_limits
FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert rate_limits"
ON public.rate_limits
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update rate_limits"
ON public.rate_limits
FOR UPDATE
USING (true);

CREATE POLICY "Admins can delete rate_limits"
ON public.rate_limits
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));