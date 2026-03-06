/*
  # Create storage bucket for merchant photos

  1. New Storage Bucket
    - `merchant-photos` - Public bucket for storing merchant shop facade images
  
  2. Security
    - Allow authenticated users to upload photos
    - Allow public read access
    - Files are limited to images only
  
  3. Policies
    - Authenticated merchants can upload their own photos
    - Anyone can view photos (public read)
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'merchant-photos',
  'merchant-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Merchants can upload their photos" ON storage.objects;
CREATE POLICY "Merchants can upload their photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'merchant-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Merchants can update their photos" ON storage.objects;
CREATE POLICY "Merchants can update their photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'merchant-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Merchants can delete their photos" ON storage.objects;
CREATE POLICY "Merchants can delete their photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'merchant-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Anyone can view merchant photos" ON storage.objects;
CREATE POLICY "Anyone can view merchant photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'merchant-photos');