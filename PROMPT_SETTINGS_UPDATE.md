# Prompt Settings Enhancement

This update adds temperature controls and thinking token budget support to the PromptCard component.

## Changes Made

### 1. Database Schema Updates

- Added `temperature` column to the `prompt` table (DECIMAL(2,1), default 0.0)
- Added `thinking_token_budget` column to the `prompt` table (INTEGER, default -1)

### 2. PromptCard Component Updates

- Replaced `promptText` prop with `promptSettings` object containing:
  - `promptText`: The prompt text content
  - `temperature`: Temperature setting (0.0 to 1.0 in 0.1 increments)
- Added compact temperature selector with values 0.0 through 1.0
- Temperature control positioned to the left of copy/paste buttons

### 3. RunsTab Integration

- Updated to use new `promptSettings` structure
- Modified prompt saving to include temperature and thinking token budget
- Updated prompt loading to restore temperature and thinking token budget settings

### 4. OpenRouter Client Updates

- Enhanced API call to use temperature setting and thinking tokens when appropriate

## Database Migration

To apply the database changes, run the following SQL in your Supabase SQL editor:

```sql
-- Add temperature and thinking_token_budget columns to the prompt table
ALTER TABLE prompt
ADD COLUMN temperature DECIMAL(2,1) DEFAULT 0.0,
ADD COLUMN thinking_token_budget INTEGER DEFAULT -1;

-- Update existing prompts to have default values
UPDATE prompt
SET temperature = 0.0, thinking_token_budget = -1
WHERE temperature IS NULL OR thinking_token_budget IS NULL;
```

Alternatively, you can run the migration file:

```bash
# Copy the contents of migration_add_prompt_settings.sql to your Supabase SQL editor
```

## Usage

The temperature control appears as a small dropdown in the prompt card header:

- Shows "Temp: [value]"
- Provides values from 0.0 to 1.0 in 0.1 increments
- Default value is 0.0 (deterministic)
- Settings are automatically saved with the prompt

The thinking token budget is currently set to -1 (disabled) by default but can be modified in the code for future enhancements.

## Files Modified

- `src/components/PromptCard.tsx` - Updated interface and UI
- `src/components/RunsTab.tsx` - Updated to use new prompt settings structure
- `src/integrations/supabase/types.ts` - Added new columns to prompt table types
- `src/integrations/openrouter/client.ts` - Enhanced API integration
- `migration_add_prompt_settings.sql` - Database migration script
