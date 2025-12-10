-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  home_address TEXT,
  work_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can only access their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

-- Create commute_schedule table for weekly schedule
CREATE TABLE public.commute_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  to_work_start TIME NOT NULL DEFAULT '07:00',
  to_work_end TIME NOT NULL DEFAULT '10:00',
  from_work_start TIME NOT NULL DEFAULT '14:00',
  from_work_end TIME NOT NULL DEFAULT '18:00',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, day_of_week)
);

-- Enable RLS
ALTER TABLE public.commute_schedule ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can only access their own schedule
CREATE POLICY "Users can view their own schedule"
ON public.commute_schedule FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own schedule"
ON public.commute_schedule FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own schedule"
ON public.commute_schedule FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own schedule"
ON public.commute_schedule FOR DELETE
USING (auth.uid() = user_id);

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id);
  
  -- Create default schedule for all 7 days
  INSERT INTO public.commute_schedule (user_id, day_of_week)
  VALUES 
    (NEW.id, 0), -- Sunday
    (NEW.id, 1), -- Monday
    (NEW.id, 2), -- Tuesday
    (NEW.id, 3), -- Wednesday
    (NEW.id, 4), -- Thursday
    (NEW.id, 5), -- Friday
    (NEW.id, 6); -- Saturday
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_profile_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_profile_updated_at();

CREATE TRIGGER update_commute_schedule_updated_at
  BEFORE UPDATE ON public.commute_schedule
  FOR EACH ROW EXECUTE FUNCTION public.update_profile_updated_at();