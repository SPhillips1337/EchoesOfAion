-- Add explored_systems column to empires table
ALTER TABLE empires ADD COLUMN IF NOT EXISTS explored_systems JSONB DEFAULT '[]'::jsonb;
