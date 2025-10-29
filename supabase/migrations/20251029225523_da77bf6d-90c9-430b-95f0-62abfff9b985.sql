-- Add email column to sms_subscriptions table
ALTER TABLE public.sms_subscriptions 
ADD COLUMN email text;

-- Make phone_number nullable since either phone or email can be provided
ALTER TABLE public.sms_subscriptions 
ALTER COLUMN phone_number DROP NOT NULL;

-- Make hours optional (nullable)
ALTER TABLE public.sms_subscriptions 
ALTER COLUMN go_to_work_hour DROP NOT NULL,
ALTER COLUMN back_to_home_hour DROP NOT NULL;

-- Add constraint to ensure at least phone or email is provided
ALTER TABLE public.sms_subscriptions
ADD CONSTRAINT phone_or_email_required CHECK (
  phone_number IS NOT NULL OR email IS NOT NULL
);

-- Add comment for documentation
COMMENT ON COLUMN public.sms_subscriptions.email IS 'User email for notifications (alternative to phone number)';