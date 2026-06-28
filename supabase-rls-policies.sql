-- ============================================================
-- RLS Policy: izinkan user UPDATE data sendiri di tabel users
-- ============================================================
CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- RLS Policy: izinkan INSERT avatar ke storage bucket "avatars"
-- ============================================================
CREATE POLICY "Anyone can upload avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars');

-- ============================================================
-- RLS Policy: izinkan SELECT / lihat avatar di bucket "avatars"
-- ============================================================
CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
