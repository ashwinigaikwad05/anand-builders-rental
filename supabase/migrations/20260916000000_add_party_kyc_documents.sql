-- ==============================================================================
-- Add Customer Face Image, Aadhaar Card, and Cheque Photo Columns to parties table
-- ==============================================================================

ALTER TABLE parties 
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS aadhaar_url TEXT,
ADD COLUMN IF NOT EXISTS cheque_url TEXT;

COMMENT ON COLUMN parties.photo_url IS 'Base64 data URL or storage URL of customer face / profile image';
COMMENT ON COLUMN parties.aadhaar_url IS 'Base64 data URL or storage URL of Aadhaar Card identity proof';
COMMENT ON COLUMN parties.cheque_url IS 'Base64 data URL or storage URL of security/guarantee cheque photo';
