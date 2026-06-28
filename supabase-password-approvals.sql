-- ============================================================
-- Tabel: password_approvals
-- Digunakan untuk approval reset password oleh manager/marketing
-- ke admin. Status: pending → approved / rejected
-- ============================================================
CREATE TABLE IF NOT EXISTS password_approvals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) NOT NULL,
  username VARCHAR(100) NOT NULL,
  nama_lengkap VARCHAR(255) NOT NULL,
  old_password VARCHAR(255) NOT NULL,
  new_password VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by VARCHAR(255),
  reviewed_at TIMESTAMPTZ
);

-- Index untuk query status pending
CREATE INDEX IF NOT EXISTS idx_password_approvals_pending
  ON password_approvals (status)
  WHERE status = 'pending';

-- RLS: izinkan insert & select untuk semua user yang terautentikasi
ALTER TABLE password_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert password approvals" ON password_approvals;
CREATE POLICY "Anyone can insert password approvals"
  ON password_approvals FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view password approvals" ON password_approvals;
CREATE POLICY "Anyone can view password approvals"
  ON password_approvals FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can update password approvals" ON password_approvals;
CREATE POLICY "Anyone can update password approvals"
  ON password_approvals FOR UPDATE
  USING (true)
  WITH CHECK (true);
