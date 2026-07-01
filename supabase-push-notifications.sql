-- ============================================================
-- push_subscriptions — menyimpan subscription push notification
-- ============================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index untuk lookup cepat berdasarkan endpoint
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON push_subscriptions (endpoint);

-- Row Level Security
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: semua operasi diizinkan (untuk anonymous usage)
CREATE POLICY "Allow all on push_subscriptions"
  ON push_subscriptions
  FOR ALL
  USING (true)
  WITH CHECK (true);
