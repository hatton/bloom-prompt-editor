import { supabase } from "@/integrations/supabase/client";
import { getMetadataFields } from "@/components/FieldSetEditor";
import type { Tables } from "@/integrations/supabase/types";

type FieldSet = Tables<"field-set">;
type Run = Tables<"run">;

/**
 * Calculate the score for an input book by comparing correct answers to the most recent run's discovered fields.
 * Returns the score (positive for matches, negative for mismatches) or undefined if no correct answers are available.
 */
export async function getScore(
  inputBookId: number
): Promise<number | undefined> {
  console.log(`[getScore] Starting calculation for inputBookId: ${inputBookId}`);
  
  try {
    // Get the input book with its correct_fields reference
    console.log(`[getScore] Fetching input book data...`);
    const { data: inputBook, error: inputError } = await supabase
      .from("book-input")
      .select("correct_fields")
      .eq("id", inputBookId)
      .single();

    if (inputError) {
      console.error("[getScore] Error fetching input book:", inputError);
      return undefined;
    }

    console.log(`[getScore] Input book data:`, inputBook);

    // If no correct fields are set, return undefined
    if (!inputBook.correct_fields) {
      console.log(`[getScore] No correct_fields set for input book, returning undefined`);
      return undefined;
    }

    console.log(`[getScore] Correct fields ID: ${inputBook.correct_fields}`);

    // Get the correct answers (field-set)
    console.log(`[getScore] Fetching correct field set...`);
    const { data: correctFieldSet, error: correctError } = await supabase
      .from("field-set")
      .select("*")
      .eq("id", inputBook.correct_fields)
      .single();

    if (correctError) {
      console.error("[getScore] Error fetching correct field set:", correctError);
      return undefined;
    }

    console.log(`[getScore] Correct field set:`, correctFieldSet);

    // Get the most recent run for this input book
    console.log(`[getScore] Fetching most recent run...`);
    const { data: recentRun, error: runError } = await supabase
      .from("run")
      .select("discovered_fields")
      .eq("book_input_id", inputBookId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (runError) {
      // If no runs exist, return undefined
      if (runError.code === "PGRST116") {
        console.log(`[getScore] No runs found for input book ${inputBookId}`);
        return undefined;
      }
      console.error("[getScore] Error fetching recent run:", runError);
      return undefined;
    }

    console.log(`[getScore] Recent run data:`, recentRun);

    // If the run has no discovered fields, return undefined
    if (!recentRun.discovered_fields) {
      console.log(`[getScore] Recent run has no discovered_fields, returning undefined`);
      console.log(`[getScore] This means no LLM output has been processed and stored for comparison yet`);
      return undefined;
    }

    console.log(`[getScore] Discovered fields ID: ${recentRun.discovered_fields}`);

    // Get the discovered fields from the run
    console.log(`[getScore] Fetching discovered field set...`);
    const { data: discoveredFieldSet, error: discoveredError } = await supabase
      .from("field-set")
      .select("*")
      .eq("id", recentRun.discovered_fields)
      .single();

    if (discoveredError) {
      console.error("[getScore] Error fetching discovered field set:", discoveredError);
      return undefined;
    }

    console.log(`[getScore] Discovered field set:`, discoveredFieldSet);

    // Get the list of metadata fields to compare
    const metadataFields = getMetadataFields();
    console.log(`[getScore] Metadata fields to compare:`, metadataFields.map(f => f.name));
    let score = 0;

    // Compare each metadata field
    for (const field of metadataFields) {
      const correctValue = correctFieldSet[field.name] as string | null;
      const discoveredValue = discoveredFieldSet[field.name] as string | null;

      console.log(`[getScore] Comparing field '${field.name}': correct='${correctValue}', discovered='${discoveredValue}'`);

      // Only score fields that have correct answers
      if (
        correctValue !== null &&
        correctValue !== undefined &&
        correctValue.trim() !== ""
      ) {
        // Normalize values for comparison (trim whitespace, case-insensitive)
        const normalizedCorrect = correctValue.trim().toLowerCase();
        const normalizedDiscovered = (discoveredValue || "")
          .trim()
          .toLowerCase();

        console.log(`[getScore] Normalized values - correct: '${normalizedCorrect}', discovered: '${normalizedDiscovered}'`);

        if (normalizedCorrect === normalizedDiscovered) {
          score += 1; // Match: +1 point
          console.log(`[getScore] ✓ Match for '${field.name}': +1 point (total: ${score})`);
        } else {
          score -= 1; // Mismatch: -1 point
          console.log(`[getScore] ✗ Mismatch for '${field.name}': -1 point (total: ${score})`);
        }
      } else {
        console.log(`[getScore] Skipping field '${field.name}': no correct answer provided`);
      }
    }

    console.log(`[getScore] Final score: ${score}`);
    return score;
  } catch (error) {
    console.error("[getScore] Error calculating score:", error);
    return undefined;
  }
}
