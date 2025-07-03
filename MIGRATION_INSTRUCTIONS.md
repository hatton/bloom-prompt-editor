# Database Migration Instructions

To add the new temperature and thinking_token_budget columns to the prompt table, you need to run the SQL migration.

## Option 1: Using Supabase Dashboard

1. Open your Supabase project dashboard
2. Go to the SQL Editor
3. Open the file `supabase/migrations/add_prompt_settings.sql`
4. Copy and paste the SQL code into the editor
5. Click "Run" to execute the migration

## Option 2: Using Supabase CLI (if you have it set up)

```bash
supabase db push
```

## Migration Content

The migration adds two new columns to the `prompt` table:

- `temperature` (DECIMAL(3,2), default 0.0) - Temperature parameter for LLM generation (0.0 to 1.0)
- `thinking_token_budget` (INTEGER, default -1) - Token budget for thinking/reasoning. -1 means disabled

After running this migration, the application will be able to store and retrieve temperature and thinking token budget settings for each prompt.
