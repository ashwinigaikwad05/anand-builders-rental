-- ==============================================================================
-- MIGRATION: 20260911000000_add_40day_rental_cycles.sql
-- Description: Adds rental_cycles table for isolated 40-day cycle financial tracking,
--              adds pointer columns to rentals, sets RLS policies and backfills existing rentals.
-- ==============================================================================

-- 1. Create rental_cycles table
CREATE TABLE IF NOT EXISTS rental_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id UUID NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
  party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  cycle_number INTEGER NOT NULL DEFAULT 1,
  start_date DATE NOT NULL,
  expected_end_date DATE NOT NULL,
  actual_end_date DATE,
  days INTEGER NOT NULL DEFAULT 40,
  extra_days INTEGER NOT NULL DEFAULT 0,
  daily_rate NUMERIC(10,2) NOT NULL DEFAULT 1.50,
  quantity INTEGER NOT NULL DEFAULT 0,
  base_rent NUMERIC(12,2) NOT NULL DEFAULT 0,
  extra_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  pending_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rental_cycles_rental_id ON rental_cycles(rental_id);
CREATE INDEX IF NOT EXISTS idx_rental_cycles_party_id ON rental_cycles(party_id);
CREATE INDEX IF NOT EXISTS idx_rental_cycles_status ON rental_cycles(status);
CREATE INDEX IF NOT EXISTS idx_rental_cycles_start_date ON rental_cycles(start_date);
CREATE INDEX IF NOT EXISTS idx_rental_cycles_expected_end_date ON rental_cycles(expected_end_date);

-- 3. Add trigger for updated_at
DROP TRIGGER IF EXISTS set_rental_cycles_updated_at ON rental_cycles;
CREATE TRIGGER set_rental_cycles_updated_at
BEFORE UPDATE ON rental_cycles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 4. Extend rentals table with cycle pointers (safe & non-destructive)
ALTER TABLE rentals 
  ADD COLUMN IF NOT EXISTS current_cycle_number INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS current_cycle_start_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS current_cycle_end_date DATE DEFAULT CURRENT_DATE + INTERVAL '39 days';

-- 5. Row Level Security (RLS)
ALTER TABLE rental_cycles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin rental_cycles policy" ON rental_cycles;
CREATE POLICY "Admin rental_cycles policy" ON rental_cycles
  FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- 6. Add to Realtime Publication if available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE rental_cycles;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 7. Automatic Backfill: Create single Cycle 1 record for each existing rental if not already present
INSERT INTO rental_cycles (
  rental_id,
  party_id,
  cycle_number,
  start_date,
  expected_end_date,
  actual_end_date,
  days,
  extra_days,
  daily_rate,
  quantity,
  base_rent,
  extra_amount,
  total_amount,
  paid_amount,
  pending_amount,
  status
)
SELECT 
  r.id,
  r.party_id,
  1,
  r.issue_date,
  r.issue_date + INTERVAL '39 days',
  r.actual_return_date,
  r.days,
  0,
  r.daily_rate,
  r.quantity,
  r.total_rent,
  0,
  r.total_rent,
  r.paid_amount,
  r.pending_amount,
  CASE WHEN r.status = 'returned' THEN 'completed' ELSE 'active' END
FROM rentals r
WHERE r.id NOT IN (SELECT DISTINCT rental_id FROM rental_cycles)
ON CONFLICT DO NOTHING;
