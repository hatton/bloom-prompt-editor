import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { fieldDefinitions } from "@/lib/fieldParsing";

type FieldSet = Tables<"field-set">;
type Run = Tables<"run">;

interface RunResultsProps {
  runId: number | null;
}

export const RunResults = ({ runId }: RunResultsProps) => {
  const [correctFields, setCorrectFields] = useState<FieldSet | null>(null);
  const [resultFields, setResultFields] = useState<FieldSet | null>(null);

  useEffect(() => {
    const loadFieldSets = async () => {
      try {
        if (!runId) {
          setCorrectFields(null);
          setResultFields(null);
          return;
        }

        // Get the run with its related book input and field sets
        const { data: run, error: runError } = await supabase
          .from("run")
          .select(
            `
            *,
            book_input_id,
            discovered_fields
          `
          )
          .eq("id", runId)
          .single();

        if (runError) {
          console.error("Error loading run:", runError);
          setCorrectFields(null);
          setResultFields(null);
          return;
        }

        // Load result fields from the run's discovered_fields
        if (run.discovered_fields) {
          const { data: resultFieldSet, error: resultError } = await supabase
            .from("field-set")
            .select("*")
            .eq("id", run.discovered_fields)
            .single();

          if (resultError) {
            console.error("Error loading result field set:", resultError);
            setResultFields(null);
          } else {
            setResultFields(resultFieldSet);
          }
        } else {
          setResultFields(null);
        }

        // Load correct fields from the book input's correct_fields
        if (run.book_input_id) {
          const { data: bookInput, error: bookError } = await supabase
            .from("book-input")
            .select("correct_fields")
            .eq("id", run.book_input_id)
            .single();

          if (bookError) {
            console.error("Error loading book input:", bookError);
            setCorrectFields(null);
          } else if (bookInput.correct_fields) {
            const { data: correctFieldSet, error: correctError } =
              await supabase
                .from("field-set")
                .select("*")
                .eq("id", bookInput.correct_fields)
                .single();

            if (correctError) {
              console.error("Error loading correct field set:", correctError);
              setCorrectFields(null);
            } else {
              setCorrectFields(correctFieldSet);
            }
          } else {
            setCorrectFields(null);
          }
        } else {
          setCorrectFields(null);
        }
      } catch (error) {
        console.error("Error loading field sets:", error);
        setCorrectFields(null);
        setResultFields(null);
      }
    };

    loadFieldSets();
  }, [runId]);

  return (
    <div className="flex-1 overflow-hidden bg-white flex flex-col">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Field</TableHead>
            <TableHead>Correct</TableHead>
            <TableHead>This Run</TableHead>
          </TableRow>
        </TableHeader>
      </Table>
      <div className="flex-1 overflow-auto">
        <Table>
          <TableBody>
            {(() => {
              // Sort fields by priority:
              // 1) Correct non-empty, result different (mismatches with correct values)
              // 2) Correct empty, result non-empty (unexpected extractions)
              // 3) Correct and result match (successful matches)
              // 4) Both empty (no data)
              const sortedFields = [...fieldDefinitions].sort((a, b) => {
                const aCorrectValue =
                  (correctFields?.[
                    a.dbFieldName as keyof FieldSet
                  ] as string) || "";
                const bCorrectValue =
                  (correctFields?.[
                    b.dbFieldName as keyof FieldSet
                  ] as string) || "";
                const aResultValue =
                  (resultFields?.[a.dbFieldName as keyof FieldSet] as string) ||
                  "";
                const bResultValue =
                  (resultFields?.[b.dbFieldName as keyof FieldSet] as string) ||
                  "";

                // Helper function to get priority category
                const getPriority = (
                  correct: string,
                  result: string
                ): number => {
                  const hasCorrect = Boolean(correct);
                  const hasResult = Boolean(result);

                  if (hasCorrect && hasResult && correct !== result) return 1; // Mismatch with correct value
                  if (!hasCorrect && hasResult) return 2; // Unexpected extraction
                  if (hasCorrect && hasResult && correct === result) return 3; // Match
                  if (!hasCorrect && !hasResult) return 4; // Both empty
                  if (hasCorrect && !hasResult) return 1; // Missing extraction (treat as high priority)
                  return 5; // Fallback
                };

                const aPriority = getPriority(aCorrectValue, aResultValue);
                const bPriority = getPriority(bCorrectValue, bResultValue);

                // Primary sort: by priority category
                if (aPriority !== bPriority) {
                  return aPriority - bPriority;
                }

                // Secondary sort: by original definition order
                return (
                  fieldDefinitions.indexOf(a) - fieldDefinitions.indexOf(b)
                );
              });

              return sortedFields.map((field) => {
                const correctValue =
                  (correctFields?.[
                    field.dbFieldName as keyof FieldSet
                  ] as string) || "";
                const resultValue =
                  (resultFields?.[
                    field.dbFieldName as keyof FieldSet
                  ] as string) || "";

                // Determine row background color based on comparison
                let rowClassName = "";
                if (correctValue && resultValue) {
                  // Both values exist - check if they match
                  if (correctValue === resultValue) {
                    rowClassName = "bg-green-50"; // Light green for match
                  } else {
                    rowClassName = "bg-red-50"; // Light red for mismatch
                  }
                } else if (correctValue && !resultValue) {
                  // Have correct value but no result value
                  rowClassName = "bg-yellow-50"; // Light orange for missing extracted value
                } else if (!correctValue && resultValue) {
                  // No correct value but have result value
                  rowClassName = "bg-blue-50"; // Light blue for unexpected value
                }

                return (
                  <TableRow key={field.dbFieldName} className={rowClassName}>
                    <TableCell className="font-medium w-[200px]">
                      {field.label}
                    </TableCell>
                    <TableCell className="max-w-[300px] break-words">
                      {correctValue || (
                        <span className="text-muted-foreground italic"></span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[300px] break-words">
                      {resultValue || (
                        <span className="text-muted-foreground italic"></span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              });
            })()}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
