BEGIN;

-- Add colonized_by_empire_id column to planets table
ALTER TABLE planets ADD COLUMN IF NOT EXISTS colonized_by_empire_id UUID;

-- Add foreign key constraint referencing empires(id)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_planets_colonized_by_empire_id') THEN
        ALTER TABLE planets 
        ADD CONSTRAINT fk_planets_colonized_by_empire_id 
        FOREIGN KEY (colonized_by_empire_id) 
        REFERENCES empires(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- Add index on colonized_by_empire_id for query performance
CREATE INDEX IF NOT EXISTS idx_planets_colonized_by_empire_id 
ON planets(colonized_by_empire_id);

COMMIT;

-- Rollback: DROP statements
-- BEGIN;
-- DROP INDEX IF EXISTS idx_planets_colonized_by_empire_id;
-- ALTER TABLE planets DROP CONSTRAINT IF EXISTS fk_planets_colonized_by_empire_id;
-- ALTER TABLE planets DROP COLUMN IF EXISTS colonized_by_empire_id;
-- COMMIT;
