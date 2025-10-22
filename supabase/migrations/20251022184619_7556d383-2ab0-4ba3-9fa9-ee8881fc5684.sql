-- Enable full replica identity for street_chat_messages table for realtime updates
ALTER TABLE public.street_chat_messages REPLICA IDENTITY FULL;