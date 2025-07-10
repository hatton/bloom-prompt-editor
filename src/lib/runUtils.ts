import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Run = Tables<"run">;

/**
 * Get the most recent run for a given book input ID.
 * Returns the run data or null if no runs exist.
 */
export async function getMostRecentRun(
  inputBookId: number
): Promise<Run | null> {
  try {
    const { data: recentRun, error: runError } = await supabase
      .from("run")
      .select("*")
      .eq("book_input_id", inputBookId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (runError) {
      // If no runs exist, return null
      if (runError.code === "PGRST116") {
        return null;
      }
      console.error("Error fetching recent run:", runError);
      return null;
    }

    return recentRun;
  } catch (error) {
    console.error("Error getting most recent run:", error);
    return null;
  }
}

/**
 * Get the field-set ID from the most recent run for a given book input ID.
 * Returns the field-set ID or null if no runs exist or no discovered fields.
 */
export async function getMostRecentRunFieldSetId(
  inputBookId: number
): Promise<number | null> {
  const recentRun = await getMostRecentRun(inputBookId);
  return recentRun?.discovered_fields || null;
}
