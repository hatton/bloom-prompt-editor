// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://jlvvfokhjgxkwnxvywap.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpsdnZmb2toamd4a3dueHZ5d2FwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzMjUxODAsImV4cCI6MjA2NjkwMTE4MH0.RP4_ggJEih3LhuY-te4VKvmyWHCEg8j_Xu63obu6leY";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});