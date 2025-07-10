import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { InlineToast } from "@/components/ui/inline-toast";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type FieldSet = Tables<"field-set">;

interface FieldSetEditorProps {
  selectedInputId: number | null;
  fieldSetId: number | null;
  onFieldSetUpdate: (fieldSetId: number) => void;
}

// Generate field definitions from the database types, excluding system fields
export const getMetadataFields = () => {
  // Extract field names from the FieldSet type (excluding system fields)
  const fieldNames: (keyof Omit<FieldSet, "id" | "created_at">)[] = [
    "copyright",
    "title_l1",
    "title_l2",
    "license_url",
    "isbn",
    "licenseDescription",
    "licenseNotes",
    "originalCopyright",
    "smallCoverCredits",
    "topic",
    "credits",
    "versionAcknowledgments",
    "originalContributions",
    "originalAcknowledgments",
    "funding",
    "country",
    "province",
    "district",
    "author",
    "illustrator",
    "publisher",
    "originalPublisher",
  ];

  return fieldNames.map((field) => ({
    name: field,
    label: field
      .replace(/([A-Z])/g, " $1")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase()),
    type: field === "license_url" ? "url" : "text",
  }));
};

const fieldDefinitions = getMetadataFields();

export const FieldSetEditor = ({
  selectedInputId,
  fieldSetId,
  onFieldSetUpdate,
}: FieldSetEditorProps) => {
  const { toast } = useToast();

  // Field-set state
  const [currentFieldSet, setCurrentFieldSet] = useState<FieldSet | null>(null);
  const [fieldSetData, setFieldSetData] = useState<Partial<FieldSet>>({});
  const [originalFieldSetData, setOriginalFieldSetData] = useState<
    Partial<FieldSet>
  >({});

  // Inline toast state
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [savedToastMessage, setSavedToastMessage] = useState("");
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorToastMessage, setErrorToastMessage] = useState("");
  const [toastFieldName, setToastFieldName] = useState<string | null>(null);

  // Load field-set data when fieldSetId changes
  useEffect(() => {
    const loadFieldSet = async () => {
      if (!fieldSetId) {
        setCurrentFieldSet(null);
        setFieldSetData({});
        setOriginalFieldSetData({});
        return;
      }

      try {
        const { data, error } = await supabase
          .from("field-set")
          .select("*")
          .eq("id", fieldSetId)
          .single();

        if (error) throw error;

        console.log(
          `Loaded field set data for field-set.id=${fieldSetId}:`,
          data
        );

        setCurrentFieldSet(data);
        setFieldSetData(data);
        setOriginalFieldSetData(data);
      } catch (error) {
        console.error("Error loading field set:", error);
        setCurrentFieldSet(null);
        setFieldSetData({});
        setOriginalFieldSetData({});
      }
    };

    loadFieldSet();
  }, [fieldSetId]);

  // Save changes before unmounting or input change
  useEffect(() => {
    return () => {
      // Save any unsaved changes when component unmounts or fieldSetId changes
      const saveUnsavedChanges = async () => {
        if (!selectedInputId) return;

        // Check if any field has unsaved changes
        const hasChanges = fieldDefinitions.some((field) => {
          const currentVal = (fieldSetData[field.name] as string) || "";
          const originalVal =
            (originalFieldSetData[field.name] as string) || "";
          return currentVal !== originalVal;
        });

        if (hasChanges) {
          try {
            // Prepare data for upsert, removing id and created_at
            const { id, created_at, ...updateData } = fieldSetData;

            if (!currentFieldSet) {
              // Create new field-set
              const { data, error } = await supabase
                .from("field-set")
                .insert(updateData)
                .select()
                .single();

              if (error) throw error;

              // Update book-input to reference the new field-set
              await supabase
                .from("book-input")
                .update({ correct_fields: data.id })
                .eq("id", selectedInputId);

              // Notify parent component of the update
              onFieldSetUpdate(data.id);
            } else {
              // Update existing field-set
              await supabase
                .from("field-set")
                .update(updateData)
                .eq("id", currentFieldSet.id);
            }
          } catch (error) {
            console.error("Error saving before unmount:", error);
          }
        }
      };

      saveUnsavedChanges();
    };
  }, [
    selectedInputId,
    fieldSetData,
    originalFieldSetData,
    currentFieldSet,
    onFieldSetUpdate,
  ]);

  // Field-set change handlers
  const handleFieldChange = (name: keyof FieldSet, value: string) => {
    setFieldSetData((prev) => ({ ...prev, [name]: value }));
  };

  // Auto-save field on blur
  const handleFieldBlur = async (fieldName: keyof FieldSet) => {
    const currentValue = (fieldSetData[fieldName] as string) || "";
    const originalValue = (originalFieldSetData[fieldName] as string) || "";

    if (currentValue !== originalValue && selectedInputId) {
      try {
        let fieldSetIdToUpdate = currentFieldSet?.id;

        // Prepare data for upsert, removing id and created_at
        const { id, created_at, ...updateData } = fieldSetData;

        if (!currentFieldSet) {
          // Create new field-set
          const { data, error } = await supabase
            .from("field-set")
            .insert(updateData)
            .select()
            .single();

          if (error) throw error;
          fieldSetIdToUpdate = data.id;
          setCurrentFieldSet(data);
          setFieldSetData(data);
          setOriginalFieldSetData(data);

          // Update book-input to reference the new field-set
          const { error: updateError } = await supabase
            .from("book-input")
            .update({ correct_fields: fieldSetIdToUpdate })
            .eq("id", selectedInputId);

          if (updateError) throw updateError;

          // Notify parent component of the update
          onFieldSetUpdate(fieldSetIdToUpdate);
        } else {
          // Update existing field-set
          const { data, error } = await supabase
            .from("field-set")
            .update(updateData)
            .eq("id", currentFieldSet.id)
            .select()
            .single();

          if (error) throw error;

          setCurrentFieldSet(data);
          setFieldSetData(data);
          setOriginalFieldSetData(data);
        }

        // Check if all fields are now saved
        const allFieldsMatch = fieldDefinitions.every((field) => {
          const currentVal = (fieldSetData[field.name] as string) || "";
          const originalVal =
            field.name === fieldName
              ? currentValue
              : (originalFieldSetData[field.name] as string) || "";
          return currentVal === originalVal;
        });

        // Show success toast
        const fieldLabel =
          fieldDefinitions.find((f) => f.name === fieldName)?.label ||
          String(fieldName);
        setSavedToastMessage(`${fieldLabel} saved`);
        setToastFieldName(String(fieldName));
        setShowSavedToast(true);
      } catch (error) {
        console.error(`Error saving field ${fieldName}:`, error);
        const fieldLabel =
          fieldDefinitions.find((f) => f.name === fieldName)?.label ||
          String(fieldName);
        setErrorToastMessage(`Error saving ${fieldLabel}`);
        setToastFieldName(String(fieldName));
        setShowErrorToast(true);
      }
    }
  };

  const handleToastClose = () => {
    setShowSavedToast(false);
    setShowErrorToast(false);
    setToastFieldName(null);
  };

  return (
    <Card className="p-4 bg-gray-50 mt-0">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fieldDefinitions.map((field) => (
          <div key={field.name} className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 min-w-0 flex-shrink-0 w-32">
              {field.label}
            </label>
            <div className="flex-1 relative">
              <Input
                value={(fieldSetData[field.name] as string) || ""}
                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                onBlur={() => handleFieldBlur(field.name)}
                className="w-full"
                type={field.type}
              />
              {/* Toast for this field */}
              {toastFieldName === field.name && (
                <div className="absolute top-full left-0 mt-2 z-10">
                  {showSavedToast && (
                    <InlineToast
                      title={savedToastMessage}
                      variant="default"
                      duration={2000}
                      onClose={handleToastClose}
                    />
                  )}
                  {showErrorToast && (
                    <InlineToast
                      title={errorToastMessage}
                      variant="destructive"
                      duration={3000}
                      onClose={handleToastClose}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {currentFieldSet && (
        <div className="mt-4 text-sm text-gray-500">
          Field Set ID: {currentFieldSet.id}
        </div>
      )}
    </Card>
  );
};
