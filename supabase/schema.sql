-- ==============================================================================
-- ANAND BUILDERS & DEVELOPERS - SUPABASE DATABASE SCHEMA
-- Plate Rental Management System
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 3. PARTIES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  mobile TEXT NOT NULL,
  address TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parties_name ON parties(name);
CREATE INDEX IF NOT EXISTS idx_parties_mobile ON parties(mobile);

DROP TRIGGER IF EXISTS set_parties_updated_at ON parties;
CREATE TRIGGER set_parties_updated_at
BEFORE UPDATE ON parties
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 4. PLATE TYPES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS plate_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate_size TEXT UNIQUE NOT NULL CHECK (plate_size IN ('24×3', '21×3', '18×3', '15×3', '12×3', '9×3', '6×3')),
  daily_rate NUMERIC(10,2) NOT NULL DEFAULT 1.50 CHECK (daily_rate >= 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'low_stock', 'out_of_stock')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default standard 7 sizes if not already present
INSERT INTO plate_types (plate_size, daily_rate, active, status)
VALUES 
  ('24×3', 1.50, TRUE, 'available'),
  ('21×3', 1.50, TRUE, 'available'),
  ('18×3', 1.50, TRUE, 'available'),
  ('15×3', 1.50, TRUE, 'available'),
  ('12×3', 1.50, TRUE, 'available'),
  ('9×3',  1.50, TRUE, 'available'),
  ('6×3',  1.50, TRUE, 'available')
ON CONFLICT (plate_size) DO NOTHING;

DROP TRIGGER IF EXISTS set_plate_types_updated_at ON plate_types;
CREATE TRIGGER set_plate_types_updated_at
BEFORE UPDATE ON plate_types
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 5. INVENTORY STOCK TABLE
-- Stores yard stock additions made by Admin (Total Owned Inventory)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate_size TEXT NOT NULL CHECK (plate_size IN ('24×3', '21×3', '18×3', '15×3', '12×3', '9×3', '6×3')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_stock_plate_size ON inventory_stock(plate_size);
CREATE INDEX IF NOT EXISTS idx_inventory_stock_received_date ON inventory_stock(received_date DESC);

DROP TRIGGER IF EXISTS set_inventory_stock_updated_at ON inventory_stock;
CREATE TRIGGER set_inventory_stock_updated_at
BEFORE UPDATE ON inventory_stock
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 6. RENTALS TABLE
-- Dispatched rental sheets / agreements
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  party_name TEXT NOT NULL,
  plate_type TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  daily_rate NUMERIC(10,2) NOT NULL DEFAULT 1.50,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_return_date DATE,
  actual_return_date DATE,
  days INTEGER NOT NULL DEFAULT 40 CHECK (days > 0),
  total_rent NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  pending_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_mode TEXT NOT NULL DEFAULT 'Udhari' CHECK (payment_mode IN ('Account 1', 'Account 2', 'Cash', 'Udhari')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'returned', 'overdue')),
  notes TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  current_cycle_number INTEGER NOT NULL DEFAULT 1,
  current_cycle_start_date DATE DEFAULT CURRENT_DATE,
  current_cycle_end_date DATE DEFAULT CURRENT_DATE + INTERVAL '39 days',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rentals_party_id ON rentals(party_id);
CREATE INDEX IF NOT EXISTS idx_rentals_status ON rentals(status);
CREATE INDEX IF NOT EXISTS idx_rentals_issue_date ON rentals(issue_date DESC);

DROP TRIGGER IF EXISTS set_rentals_updated_at ON rentals;
CREATE TRIGGER set_rentals_updated_at
BEFORE UPDATE ON rentals
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 6.1 RENTAL CYCLES TABLE
-- 40-day cycle financial isolation, renewal tracking & extra days records
-- ------------------------------------------------------------------------------
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

CREATE INDEX IF NOT EXISTS idx_rental_cycles_rental_id ON rental_cycles(rental_id);
CREATE INDEX IF NOT EXISTS idx_rental_cycles_party_id ON rental_cycles(party_id);
CREATE INDEX IF NOT EXISTS idx_rental_cycles_status ON rental_cycles(status);
CREATE INDEX IF NOT EXISTS idx_rental_cycles_start_date ON rental_cycles(start_date);
CREATE INDEX IF NOT EXISTS idx_rental_cycles_expected_end_date ON rental_cycles(expected_end_date);

DROP TRIGGER IF EXISTS set_rental_cycles_updated_at ON rental_cycles;
CREATE TRIGGER set_rental_cycles_updated_at
BEFORE UPDATE ON rental_cycles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 7. RETURNS TABLE
-- Material return intakes from construction sites
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id UUID REFERENCES rentals(id) ON DELETE SET NULL,
  party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  party_name TEXT NOT NULL,
  plate_type TEXT NOT NULL,
  issued_quantity INTEGER NOT NULL DEFAULT 0,
  returned_quantity INTEGER NOT NULL CHECK (returned_quantity > 0),
  remaining_quantity INTEGER NOT NULL DEFAULT 0,
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_returns_party_id ON returns(party_id);
CREATE INDEX IF NOT EXISTS idx_returns_rental_id ON returns(rental_id);
CREATE INDEX IF NOT EXISTS idx_returns_return_date ON returns(return_date DESC);

-- ------------------------------------------------------------------------------
-- 8. PAYMENTS TABLE
-- Received payments and settlements
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  party_name TEXT NOT NULL,
  rental_id UUID REFERENCES rentals(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_mode TEXT NOT NULL CHECK (payment_mode IN ('Account 1', 'Account 2', 'Cash', 'Udhari')),
  reference TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'verified' CHECK (status IN ('verified', 'pending')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_party_id ON payments(party_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_mode ON payments(payment_mode);

-- ------------------------------------------------------------------------------
-- 9. LEDGER ENTRIES TABLE
-- Party financial transaction debit/credit log
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  debit NUMERIC(12,2) NOT NULL DEFAULT 0,
  credit NUMERIC(12,2) NOT NULL DEFAULT 0,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  reference_type TEXT,
  reference_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_party_id ON ledger_entries(party_id);
CREATE INDEX IF NOT EXISTS idx_ledger_date ON ledger_entries(date DESC);

-- ------------------------------------------------------------------------------
-- 10. NOTIFICATIONS TABLE
-- System alerts (payments, overdue rentals, stock alerts)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID REFERENCES parties(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('payment', 'due', 'return', 'partial', 'stock')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ------------------------------------------------------------------------------
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE plate_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_cycles ENABLE ROW LEVEL SECURITY;

-- 11.1 PLATE TYPES (Public Read for Landing Page & Pricing Calculator)
DROP POLICY IF EXISTS "Public read for plate_types" ON plate_types;
CREATE POLICY "Public read for plate_types" ON plate_types
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admin modify plate_types" ON plate_types;
CREATE POLICY "Admin modify plate_types" ON plate_types
  FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- 11.2 PARTIES
DROP POLICY IF EXISTS "Admin parties policy" ON parties;
CREATE POLICY "Admin parties policy" ON parties
  FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- 11.3 INVENTORY STOCK
DROP POLICY IF EXISTS "Admin inventory_stock policy" ON inventory_stock;
CREATE POLICY "Admin inventory_stock policy" ON inventory_stock
  FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- 11.4 RENTALS
DROP POLICY IF EXISTS "Admin rentals policy" ON rentals;
CREATE POLICY "Admin rentals policy" ON rentals
  FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- 11.5 RETURNS
DROP POLICY IF EXISTS "Admin returns policy" ON returns;
CREATE POLICY "Admin returns policy" ON returns
  FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- 11.6 PAYMENTS
DROP POLICY IF EXISTS "Admin payments policy" ON payments;
CREATE POLICY "Admin payments policy" ON payments
  FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- 11.7 LEDGER ENTRIES
DROP POLICY IF EXISTS "Admin ledger_entries policy" ON ledger_entries;
CREATE POLICY "Admin ledger_entries policy" ON ledger_entries
  FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- 11.8 NOTIFICATIONS
DROP POLICY IF EXISTS "Admin notifications policy" ON notifications;
CREATE POLICY "Admin notifications policy" ON notifications
  FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- 11.9 RENTAL CYCLES
DROP POLICY IF EXISTS "Admin rental_cycles policy" ON rental_cycles;
CREATE POLICY "Admin rental_cycles policy" ON rental_cycles
  FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- Real-time publication subscriptions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE parties, plate_types, inventory_stock, rentals, rental_cycles, returns, payments, ledger_entries, notifications;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
