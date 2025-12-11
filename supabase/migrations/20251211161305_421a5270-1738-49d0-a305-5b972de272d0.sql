-- Create table for storing calculated commute travel times
CREATE TABLE public.commute_travel_times (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  travel_date DATE NOT NULL,
  day_of_week INTEGER NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('to_work', 'from_work')),
  departure_time TIME NOT NULL,
  travel_duration_minutes INTEGER NOT NULL,
  origin_address TEXT,
  destination_address TEXT,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint to prevent duplicates
  UNIQUE(user_id, travel_date, direction, departure_time)
);

-- Enable Row Level Security
ALTER TABLE public.commute_travel_times ENABLE ROW LEVEL SECURITY;

-- Users can view their own travel times
CREATE POLICY "Users can view their own travel times"
ON public.commute_travel_times
FOR SELECT
USING (auth.uid() = user_id);

-- Service role can manage all travel times (for edge function)
CREATE POLICY "Service role can manage travel times"
ON public.commute_travel_times
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for efficient queries
CREATE INDEX idx_commute_travel_times_user_date ON public.commute_travel_times(user_id, travel_date);
CREATE INDEX idx_commute_travel_times_lookup ON public.commute_travel_times(user_id, travel_date, direction, departure_time);

-- Create trigger for updated_at
CREATE TRIGGER update_commute_travel_times_updated_at
BEFORE UPDATE ON public.commute_travel_times
FOR EACH ROW
EXECUTE FUNCTION public.update_profile_updated_at();