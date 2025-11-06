-- Enable realtime for auto_traffic_settings table
ALTER TABLE public.auto_traffic_settings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.auto_traffic_settings;