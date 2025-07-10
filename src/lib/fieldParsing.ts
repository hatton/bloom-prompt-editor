import { supabase } from "@/integrations/supabase/client";
import type { Tables, Database } from "@/integrations/supabase/types";

type FieldSetInsert = Database["public"]["Tables"]["field-set"]["Insert"];

// Field definitions that match the FieldSetEditor and FieldView
export const fieldDefinitions = [
  { dbFieldName: "title_l1", label: "Title L1" },
  { dbFieldName: "title_l2", label: "Title L2" },
  { dbFieldName: "copyright", label: "Copyright" },
  {
    dbFieldName: "license_url",
    markdownFieldName: "licenseUrl",
    label: "License URL",
  },
  { dbFieldName: "isbn", label: "ISBN" },
  { dbFieldName: "licenseDescription", label: "License Description" },
  { dbFieldName: "licenseNotes", label: "License Notes" },
  { dbFieldName: "originalCopyright", label: "Original Copyright" },
  { dbFieldName: "smallCoverCredits", label: "Small Cover Credits" },
  { dbFieldName: "topic", label: "Topic" },
  { dbFieldName: "credits", label: "Credits" },
  { dbFieldName: "versionAcknowledgments", label: "Version Acknowledgments" },
  { dbFieldName: "originalContributions", label: "Original Contributions" },
  {
    dbFieldName: "originalAcknowledgments",
    label: "Original Acknowledgments",
  },
  { dbFieldName: "funding", label: "Funding" },
  { dbFieldName: "country", label: "Country" },
  { dbFieldName: "province", label: "Province" },
  { dbFieldName: "district", label: "District" },
  { dbFieldName: "author", label: "Author" },
  { dbFieldName: "illustrator", label: "Illustrator" },
  { dbFieldName: "publisher", label: "Publisher" },
  { dbFieldName: "originalPublisher", label: "Original Publisher" },
];

/**
 * Extract field value from markdown based on comment blocks
 */
export const extractField = (markdown: string, fieldName: string): string => {
  if (!markdown) return "";

  // Look for comment block with field="fieldName"
  const commentRegex = new RegExp(`<!--[^>]*field="${fieldName}"[^>]*-->`, "i");
  const match = markdown.match(commentRegex);

  if (!match) return "";

  const startIndex = match.index! + match[0].length;
  const remainingText = markdown.substring(startIndex);

  // Find the next comment block or end of document
  const nextCommentMatch = remainingText.match(/<!--/);
  const endIndex = nextCommentMatch
    ? nextCommentMatch.index!
    : remainingText.length;

  return remainingText.substring(0, endIndex).trim();
};

/**
 * Parse markdown output and create a field-set in the database
 * Returns the ID of the newly created field-set record
 *
 * Field value conventions:
 * - null: Unknown/missing data (not counted in field counts)
 * - "empty": Intentionally left empty (counted as filled field)
 * - any other string: Actual field content (counted as filled field)
 */
export const parseAndStoreFieldSet = async (
  markdown: string
): Promise<number> => {
  if (!markdown) {
    throw new Error("Cannot parse empty markdown");
  }

  // Extract all field values from the markdown
  const fieldValues: FieldSetInsert = {};

  fieldDefinitions.forEach((field) => {
    const fieldName = field.markdownFieldName || field.dbFieldName;
    const extractedValue = extractField(markdown, fieldName);

    // Use type assertion with a record type for dynamic field assignment
    const recordValues = fieldValues as Record<string, string>;

    if (extractedValue) {
      recordValues[field.dbFieldName] = extractedValue;
    } else {
      // If no value found, mark as intentionally empty rather than leaving null
      recordValues[field.dbFieldName] = "empty";
    }
  });

  // Insert the field set into the database
  const { data: newFieldSet, error } = await supabase
    .from("field-set")
    .insert(fieldValues)
    .select()
    .single();

  if (error) {
    console.error("Error creating field set:", error);
    throw error;
  }

  console.log("Created field set with ID:", newFieldSet.id);
  return newFieldSet.id;
};
