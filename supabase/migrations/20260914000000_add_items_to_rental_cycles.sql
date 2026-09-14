-- ==============================================================================
-- MIGRATION: 20260914000000_add_items_to_rental_cycles.sql
-- Description: Adds items JSONB column to rental_cycles table to store item breakdown per cycle.
-- ==============================================================================

ALTER TABLE rental_cycles 
  ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
