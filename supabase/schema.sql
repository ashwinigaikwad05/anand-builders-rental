-- ==============================================================================
-- ANAND BUILDERS & DEVELOPERS - SUPABASE DATABASE SCHEMA
-- Inventory Stock & Rental Operations Schema
-- ==============================================================================

-- 1. INVENTORY STOCK TABLE
-- Stores every stock batch/addition purchased or received into the yard.
CREATE TABLE IF NOT EXISTS inventory_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate_size TEXT NOT NULL CHECK (plate_size IN ('24×3', '21×3', '18×3', '15×3', '12×3', '9×3', '6×3')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for speedy queries by plate size and date
CREATE INDEX IF NOT EXISTS idx_inventory_stock_plate_size ON inventory_stock(plate_size);
CREATE INDEX IF NOT EXISTS idx_inventory_stock_received_date ON inventory_stock(received_date DESC);

-- Trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_inventory_stock_updated_at ON inventory_stock;
CREATE TRIGGER set_inventory_stock_updated_at
BEFORE UPDATE ON inventory_stock
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE inventory_stock ENABLE ROW LEVEL SECURITY;

-- Allow authenticated and anonymous public users with anon key full CRUD for this admin management app
CREATE POLICY "Allow public read access on inventory_stock" ON inventory_stock
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access on inventory_stock" ON inventory_stock
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access on inventory_stock" ON inventory_stock
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Allow public delete access on inventory_stock" ON inventory_stock
  FOR DELETE USING (true);

-- Enable real-time for inventory_stock (optional for Supabase realtime publication)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE inventory_stock;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
