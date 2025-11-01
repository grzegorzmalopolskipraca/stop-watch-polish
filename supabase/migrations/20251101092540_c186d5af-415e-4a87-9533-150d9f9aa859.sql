-- Update push_subscriptions table for OneSignal
-- OneSignal uses player_id instead of endpoint
ALTER TABLE push_subscriptions 
  DROP CONSTRAINT IF EXISTS push_subscriptions_endpoint_street_key;

ALTER TABLE push_subscriptions
  RENAME COLUMN endpoint TO player_id;

ALTER TABLE push_subscriptions
  DROP COLUMN IF EXISTS subscription;

-- Add unique constraint on player_id and street
ALTER TABLE push_subscriptions
  ADD CONSTRAINT push_subscriptions_player_id_street_key UNIQUE (player_id, street);