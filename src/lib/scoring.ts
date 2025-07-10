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
  try {
    // Get the input book with its correct_fields reference
    const { data: inputBook, error: inputError } = await supabase
      .from("book-input")
      .select("correct_fields")
      .eq("id", inputBookId)
      .single();

    if (inputError) {
      console.error("Error fetching input book:", inputError);
      return undefined;
    }

    // If no correct fields are set, return undefined
    if (!inputBook.correct_fields) {
      return undefined;
    }

    // Get the correct answers (field-set)
    const { data: correctFieldSet, error: correctError } = await supabase
      .from("field-set")
      .select("*")
      .eq("id", inputBook.correct_fields)
      .single();

    if (correctError) {
      console.error("Error fetching correct field set:", correctError);
      return undefined;
    }

    // Get the most recent run for this input book
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
        return undefined;
      }
      console.error("Error fetching recent run:", runError);
      return undefined;
    }

    // If the run has no discovered fields, return undefined
    if (!recentRun.discovered_fields) {
      return undefined;
    }

    // Get the discovered fields from the run
    const { data: discoveredFieldSet, error: discoveredError } = await supabase
      .from("field-set")
      .select("*")
      .eq("id", recentRun.discovered_fields)
      .single();

    if (discoveredError) {
      console.error("Error fetching discovered field set:", discoveredError);
      return undefined;
    }

    // Get the list of metadata fields to compare
    const metadataFields = getMetadataFields();
    let score = 0;

    // Compare each metadata field
    for (const field of metadataFields) {
      const correctValue = correctFieldSet[field.name] as string | null;
      const discoveredValue = discoveredFieldSet[field.name] as string | null;

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

        if (normalizedCorrect === normalizedDiscovered) {
          score += 1; // Match: +1 point
        } else {
          score -= 1; // Mismatch: -1 point
        }
      }
    }

    return score;
  } catch (error) {
    console.error("Error calculating score:", error);
    return undefined;
  }
}
