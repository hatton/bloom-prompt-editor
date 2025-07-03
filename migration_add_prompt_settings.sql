-- Add temperature and thinking_token_budget columns to the prompt table
-- Run this in your Supabase SQL editor

ALTER TABLE prompt 
ADD COLUMN temperature DECIMAL(2,1) DEFAULT 0.0,
ADD COLUMN thinking_token_budget INTEGER DEFAULT -1;

-- Update existing prompts to have default values
UPDATE prompt 
SET temperature = 0.0, thinking_token_budget = -1 
WHERE temperature IS NULL OR thinking_token_budget IS NULL;
