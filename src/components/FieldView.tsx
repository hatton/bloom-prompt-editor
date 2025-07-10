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
    { dbFieldName: "title_l1", label: "Title L1" },
    { dbFieldName: "title_l2", label: "Title L2" },
    { dbFieldName: "copyright", label: "Copyright" },
    { dbFieldName: "license_url", markdownFieldName: "licenseUrl", label: "License URL" },
    { dbFieldName: "isbn", label: "ISBN" },
    { dbFieldName: "licenseDescription", label: "License Description" },
    { dbFieldName: "licenseNotes", label: "License Notes" },
    { dbFieldName: "originalCopyright", label: "Original Copyright" },
    { dbFieldName: "smallCoverCredits", label: "Small Cover Credits" },
    { dbFieldName: "topic", label: "Topic" },
    { dbFieldName: "credits", label: "Credits" },
    { dbFieldName: "versionAcknowledgments", label: "Version Acknowledgments" },
    { dbFieldName: "originalContributions", label: "Original Contributions" },
    { dbFieldName: "originalAcknowledgments", label: "Original Acknowledgments" },
    { dbFieldName: "funding", label: "Funding" },
    { dbFieldName: "country", label: "Country" },
    { dbFieldName: "province", label: "Province" },
    { dbFieldName: "district", label: "District" },
    { dbFieldName: "author", label: "Author" },
    { dbFieldName: "illustrator", label: "Illustrator" },
    { dbFieldName: "publisher", label: "Publisher" },
    { dbFieldName: "originalPublisher", label: "Original Publisher" },
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
            {fieldDefinitions.map((field) => {
              const correctValue = correctFields?.[field.dbFieldName as keyof FieldSet] as string || "";
              const extractedValue = extractField(output, field.markdownFieldName || field.dbFieldName);
              
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
                rowClassName = "bg-yellow-50"; // Light orange for missing extracted value
              }
              
              return (
                <TableRow key={field.dbFieldName} className={rowClassName}>
                  <TableCell className="font-medium w-[200px]">{field.label}</TableCell>
                  <TableCell className="max-w-[300px] break-words">
                    {correctValue || <span className="text-muted-foreground italic"></span>}
                  </TableCell>
                  <TableCell className="max-w-[300px] break-words">
                    {extractedValue || <span className="text-muted-foreground italic"></span>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          </Table>
        </div>
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
