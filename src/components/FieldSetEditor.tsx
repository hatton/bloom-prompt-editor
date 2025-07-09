import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type FieldSet = Tables<"field-set">;

interface FieldSetEditorProps {
  selectedInputId: number | null;
  fieldSetId: number | null;
  onFieldSetUpdate: (fieldSetId: number) => void;
}

const fieldDefinitions = [
  {
    name: "title_l1" as const,
    label: "Title L1",
    placeholder: "Enter title L1...",
    className: "",
  },
  {
    name: "title_l2" as const,
    label: "Title L2",
    placeholder: "Enter title L2...",
    className: "",
  },
  {
    name: "copyright" as const,
    label: "Copyright",
    placeholder: "Enter copyright information...",
    className: "md:col-span-1",
  },
  {
    name: "license_url" as const,
    label: "License URL",
    placeholder: "Enter license URL...",
    className: "md:col-span-1",
    type: "url",
  },
];

export const FieldSetEditor = ({
  selectedInputId,
  fieldSetId,
  onFieldSetUpdate,
}: FieldSetEditorProps) => {
  const { toast } = useToast();

  // Field-set state
  const [currentFieldSet, setCurrentFieldSet] = useState<FieldSet | null>(null);
  const [fieldSetData, setFieldSetData] = useState<Partial<FieldSet>>({});
  const [hasUnsavedFieldSetChanges, setHasUnsavedFieldSetChanges] =
    useState(false);

  // Load field-set data when fieldSetId changes
  useEffect(() => {
    const loadFieldSet = async () => {
      if (!fieldSetId) {
        setCurrentFieldSet(null);
        setFieldSetData({});
        setHasUnsavedFieldSetChanges(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("field-set")
          .select("*")
          .eq("id", fieldSetId)
          .single();

        if (error) throw error;

        setCurrentFieldSet(data);
        setFieldSetData(data);
        setHasUnsavedFieldSetChanges(false);
      } catch (error) {
        console.error("Error loading field set:", error);
        setCurrentFieldSet(null);
        setFieldSetData({});
        setHasUnsavedFieldSetChanges(false);
      }
    };

    loadFieldSet();
  }, [fieldSetId]);

  // Field-set change handlers
  const handleFieldChange = (name: keyof FieldSet, value: string) => {
    setFieldSetData((prev) => ({ ...prev, [name]: value }));
    setHasUnsavedFieldSetChanges(true);
  };

  // Create or update field-set
  const saveFieldSet = async () => {
    if (!selectedInputId) return;

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
      }

      setHasUnsavedFieldSetChanges(false);
      toast({
        title: "Field set saved",
      });
    } catch (error) {
      console.error("Error saving field set:", error);
      toast({
        title: "Error saving field set",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          Correct Fields
        </h3>
        <div className="flex items-center gap-2">
          {hasUnsavedFieldSetChanges && (
            <span className="text-sm text-amber-600">
              Unsaved changes
            </span>
          )}
          <Button
            onClick={saveFieldSet}
            size="sm"
            disabled={!hasUnsavedFieldSetChanges}
          >
            Save
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fieldDefinitions.map((field) => (
          <div key={field.name} className={field.className}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
            </label>
            <Input
              value={(fieldSetData[field.name] as string) || ""}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              className="w-full"
              type={field.type || "text"}
            />
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
