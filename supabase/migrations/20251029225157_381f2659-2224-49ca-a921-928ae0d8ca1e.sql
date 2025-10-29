-- Add consent columns to sms_subscriptions table
ALTER TABLE public.sms_subscriptions 
ADD COLUMN consent_marketing boolean NOT NULL DEFAULT false,
ADD COLUMN consent_data_processing boolean NOT NULL DEFAULT false,
ADD COLUMN consent_timestamp timestamp with time zone;

-- Add comment for documentation
COMMENT ON COLUMN public.sms_subscriptions.consent_marketing IS 'User consent for receiving marketing communications (UŚUDE compliance)';
COMMENT ON COLUMN public.sms_subscriptions.consent_data_processing IS 'User consent for data processing (RODO/GDPR compliance)';
COMMENT ON COLUMN public.sms_subscriptions.consent_timestamp IS 'Timestamp when consent was given';