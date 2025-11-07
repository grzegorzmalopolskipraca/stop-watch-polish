-- Create storage bucket for coupon images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'coupon-images',
  'coupon-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Create RLS policies for coupon images bucket
CREATE POLICY "Anyone can view coupon images"
ON storage.objects FOR SELECT
USING (bucket_id = 'coupon-images');

CREATE POLICY "Authenticated users can upload coupon images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'coupon-images');

CREATE POLICY "Authenticated users can update coupon images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'coupon-images');

CREATE POLICY "Authenticated users can delete coupon images"
ON storage.objects FOR DELETE
USING (bucket_id = 'coupon-images');