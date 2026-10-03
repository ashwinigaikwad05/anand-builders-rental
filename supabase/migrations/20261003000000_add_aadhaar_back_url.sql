-- ==============================================================================
-- Add Aadhaar Card Back Side Photo Column to parties table
-- ==============================================================================

ALTER TABLE parties 
ADD COLUMN IF NOT EXISTS aadhaar_back_url TEXT;

COMMENT ON COLUMN parties.aadhaar_back_url IS 'Base64 data URL or storage URL of Aadhaar Card back side proof (address verification)';
