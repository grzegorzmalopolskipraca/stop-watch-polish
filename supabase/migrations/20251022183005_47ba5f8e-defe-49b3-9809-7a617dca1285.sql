-- Create table for street chat messages
CREATE TABLE public.street_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  street TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_fingerprint TEXT
);

-- Enable Row Level Security
ALTER TABLE public.street_chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Anyone can view chat messages" 
ON public.street_chat_messages 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert chat messages" 
ON public.street_chat_messages 
FOR INSERT 
WITH CHECK (true);

-- Create index for better performance
CREATE INDEX idx_street_chat_messages_street_created 
ON public.street_chat_messages(street, created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.street_chat_messages;