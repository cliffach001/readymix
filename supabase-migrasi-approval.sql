-- ============================================================
-- MIGRASI: Tambah tabel approval_requests untuk workflow approval
-- Marketing request edit/delete → Manager/Admin approve/reject
-- Jalankan SQL ini di Supabase SQL Editor
-- ============================================================

-- 1. Buat tabel approval_requests
CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL,            -- 'edit' atau 'delete'
  table_name TEXT NOT NULL DEFAULT 'input_data',
  record_id UUID NOT NULL,              -- id record di input_data
  plant_code TEXT NOT NULL REFERENCES plants(code),
  requested_by TEXT NOT NULL,           -- nama_lengkap pengaju
  requested_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'pending',        -- 'pending' | 'approved' | 'rejected'
  reviewed_by TEXT,                     -- nama_lengkap yg review
  reviewed_at TIMESTAMPTZ,
  original_data JSONB,                  -- snapshot data sebelum diubah
  new_data JSONB,                       -- data yang diusulkan (null untuk delete)
  notes TEXT
);

-- 2. Index untuk query cepat
CREATE INDEX IF NOT EXISTS idx_approval_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requested_at ON approval_requests(requested_at DESC);

-- 3. Row Level Security
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON approval_requests FOR ALL USING (true);
