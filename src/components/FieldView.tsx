import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type FieldSet = Tables<"field-set">;
type BookInput = Tables<"book-input">;

interface FieldViewProps {
  output: string;
  currentInputId: string;
}

export const FieldView = ({ output,  currentInputId }: FieldViewProps) => {
  const [correctFields, setCorrectFields] = useState<FieldSet | null>(null);
  

  // Field definitions that match the FieldSetEditor
  const fieldDefinitions = [
    { name: "title_l1", label: "Title L1" },
    { name: "title_l2", label: "Title L2" },
    { name: "copyright", label: "Copyright" },
    { name: "license_url", label: "License URL" },
  ];

  useEffect(() => {
    const loadCurrentInputData = async () => {
      if (!currentInputId) return;

      try {
        const { data: inputData, error: inputError } = await supabase
          .from("book-input")
          .select("*")
          .eq("id", parseInt(currentInputId))
          .single();

        if (inputError) throw inputError;
        

        console.log(`considering correct_fields=${inputData?.correct_fields} for input.id=${inputData?.id}`);
        // Load correct fields if they exist
        if (inputData?.correct_fields) {
          console.log(`Loading field-set.id=${inputData.correct_fields}`);
          const { data: fieldSetData, error: fieldSetError } = await supabase
            .from("field-set")
            .select("*")
            .eq("id", inputData.correct_fields)
            .single();

          if (fieldSetError) throw fieldSetError;
          console.log("Loaded field set data:", fieldSetData);
          setCorrectFields(fieldSetData);
        } else {
          console.warn(`The input book does not have a correct field set.`);
          setCorrectFields(null);
        }
      } catch (error) {
        console.error("Error loading input data:", error);
        
        setCorrectFields(null);
      }
    };

    loadCurrentInputData();
  }, [currentInputId]);

  return (
    
      <div className="flex-1 overflow-auto bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Field</TableHead>
              <TableHead>Correct</TableHead>
              <TableHead>This Run</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fieldDefinitions.map((field) => {
              const correctValue = correctFields?.[field.name as keyof FieldSet] as string || "";
              const extractedValue = extractField(output, field.name);
              
              // Determine row background color based on comparison
              let rowClassName = "";
              if (correctValue && extractedValue) {
                // Both values exist - check if they match
                if (correctValue === extractedValue) {
                  rowClassName = "bg-green-50"; // Light green for match
                } else {
                  rowClassName = "bg-red-50"; // Light red for mismatch
                }
              } else if (correctValue && !extractedValue) {
                // Have correct value but no extracted value
                rowClassName = "bg-orange-50"; // Light orange for missing extracted value
              }
              
              return (
                <TableRow key={field.name} className={rowClassName}>
                  <TableCell className="font-medium">{field.label}</TableCell>
                  <TableCell className="max-w-[300px] break-words">
                    {correctValue || <span className="text-muted-foreground italic">No correct value set</span>}
                  </TableCell>
                  <TableCell className="max-w-[300px] break-words">
                    {extractedValue || <span className="text-muted-foreground italic">Not found in output</span>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    
  );
};

// Extract field value from markdown based on comment blocks
const extractField = (markdown: string, fieldName: string): string => {
  if (!markdown) return "";
  
  // Look for comment block with field="fieldName"
  const commentRegex = new RegExp(`<!--[^>]*field="${fieldName}"[^>]*-->`, 'i');
  console.log(`Searching for field="${fieldName}" in markdown...`);
  const match = markdown.match(commentRegex);
  
  if (!match) return "";
  
  const startIndex = match.index! + match[0].length;
  const remainingText = markdown.substring(startIndex);
  
  // Find the next comment block or end of document
  const nextCommentMatch = remainingText.match(/<!--/);
  const endIndex = nextCommentMatch ? nextCommentMatch.index! : remainingText.length;
  
  return remainingText.substring(0, endIndex).trim();
};
