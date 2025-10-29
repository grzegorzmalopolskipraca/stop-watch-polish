-- Create SMS subscriptions table
CREATE TABLE public.sms_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  street TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  go_to_work_hour TEXT NOT NULL,
  back_to_home_hour TEXT NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.sms_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policy for anyone to insert their subscription
CREATE POLICY "Anyone can insert SMS subscriptions"
ON public.sms_subscriptions
FOR INSERT
WITH CHECK (true);

-- Create policy for viewing subscriptions (service role only for privacy)
CREATE POLICY "Service role can view SMS subscriptions"
ON public.sms_subscriptions
FOR SELECT
USING (false);

-- Create index on phone_number for faster lookups
CREATE INDEX idx_sms_subscriptions_phone_number ON public.sms_subscriptions(phone_number);

-- Create index on street for faster queries
CREATE INDEX idx_sms_subscriptions_street ON public.sms_subscriptions(street);