-- ============================================
-- STORAGE BUCKET POLICIES
-- ============================================
-- Note: The bucket must be created manually in Supabase Dashboard
-- Go to Storage → New Bucket → Name: "report-photos" → Public: ON
-- ============================================
-- Then run these policies after bucket is created
-- ============================================

-- Policy for reading photos (PUBLIC)
CREATE POLICY "Public Access for report-photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'report-photos');

-- Policy for uploading photos (PUBLIC)
CREATE POLICY "Public Upload for report-photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'report-photos');

-- Policy for updating photos (PUBLIC)
CREATE POLICY "Public Update for report-photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'report-photos');

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT '✅ Storage bucket policies created successfully!' AS message;




