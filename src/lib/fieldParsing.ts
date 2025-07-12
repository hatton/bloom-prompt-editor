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
 * Remove markdown formatting from text
 */
const cleanMarkdown = (text: string): string => {
  return (
    text
      // Remove headers (# ## ### etc.)
      .replace(/^#+\s*/gm, "")
      // Remove bold (**text** or __text__)
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/__(.*?)__/g, "$1")
      // Remove italic (*text* or _text_)
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/_(.*?)_/g, "$1")
      // Remove strikethrough (~~text~~)
      .replace(/~~(.*?)~~/g, "$1")
      // Remove inline code (`text`)
      .replace(/`(.*?)`/g, "$1")
      // Remove links [text](url) -> text
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      // Remove reference links [text][ref] -> text
      .replace(/\[([^\]]*)\]\[[^\]]*\]/g, "$1")
      // Trim whitespace
      .trim()
  );
};

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

  // Find the next comment block, image, or end of document
  const nextCommentMatch = remainingText.match(/<!--/);
  const nextImageMatch = remainingText.match(/!\[.*?\]\(.*?\)/);

  let endIndex = remainingText.length;

  if (nextCommentMatch && nextImageMatch) {
    endIndex = Math.min(nextCommentMatch.index!, nextImageMatch.index!);
  } else if (nextCommentMatch) {
    endIndex = nextCommentMatch.index!;
  } else if (nextImageMatch) {
    endIndex = nextImageMatch.index!;
  }

  const extractedValue = remainingText.substring(0, endIndex).trim();
  return cleanMarkdown(extractedValue);
};

/**
 * Extract multiple occurrences of a field from markdown
 */
const extractMultipleFields = (
  markdown: string,
  fieldName: string
): string[] => {
  if (!markdown) return [];

  const results: string[] = [];
  const commentRegex = new RegExp(
    `<!--[^>]*field="${fieldName}"[^>]*-->`,
    "gi"
  );
  let match;

  while ((match = commentRegex.exec(markdown)) !== null) {
    const startIndex = match.index + match[0].length;
    const remainingText = markdown.substring(startIndex);

    // Find the next comment block, image, or end of document
    const nextCommentMatch = remainingText.match(/<!--/);
    const nextImageMatch = remainingText.match(/!\[.*?\]\(.*?\)/);

    let endIndex = remainingText.length;

    if (nextCommentMatch && nextImageMatch) {
      endIndex = Math.min(nextCommentMatch.index!, nextImageMatch.index!);
    } else if (nextCommentMatch) {
      endIndex = nextCommentMatch.index!;
    } else if (nextImageMatch) {
      endIndex = nextImageMatch.index!;
    }

    const extractedValue = remainingText.substring(0, endIndex).trim();
    if (extractedValue) {
      results.push(cleanMarkdown(extractedValue));
    }
  }

  return results;
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

  // Special handling for bookTitle field - extract multiple occurrences
  const bookTitles = extractMultipleFields(markdown, "bookTitle");

  // Use type assertion with a record type for dynamic field assignment
  const recordValues = fieldValues as Record<string, string>;

  // Assign first bookTitle to title_l1, second to title_l2
  if (bookTitles.length > 0) {
    recordValues["title_l1"] = bookTitles[0];
  } else {
    recordValues["title_l1"] = "empty";
  }

  if (bookTitles.length > 1) {
    recordValues["title_l2"] = bookTitles[1];
  } else {
    recordValues["title_l2"] = "empty";
  }

  // Extract all other field values from the markdown
  fieldDefinitions.forEach((field) => {
    // Skip title_l1 and title_l2 as they are handled by bookTitle above
    if (field.dbFieldName === "title_l1" || field.dbFieldName === "title_l2") {
      return;
    }

    const fieldName = field.markdownFieldName || field.dbFieldName;
    const extractedValue = extractField(markdown, fieldName);

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
