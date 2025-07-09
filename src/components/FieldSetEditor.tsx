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

// Generate field definitions from the database types, excluding system fields
const getFieldDefinitions = () => {
  // Extract field names from the FieldSet type (excluding system fields)
  const fieldNames: (keyof Omit<FieldSet, 'id' | 'created_at'>)[] = [
    'copyright',
    'title_l1', 
    'title_l2',
    'license_url',
    'isbn',
    'licenseDescription',
    'licenseNotes',
    'originalCopyright',
    'smallCoverCredits',
    'topic',
    'credits',
    'versionAcknowledgments',
    'originalContributions',
    'originalAcknowledgments',
    'funding',
    'country',
    'province',
    'district',
    'author',
    'illustrator',
    'publisher',
    'originalPublisher'
  ];
  
  return fieldNames.map(field => ({
    name: field,
    label: field.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    type: field === 'license_url' ? 'url' : 'text'
  }));
};

const fieldDefinitions = getFieldDefinitions();

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

        console.log(`Loaded field set data for field-set.id=${fieldSetId}:`, data);

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
          <div key={field.name} className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 min-w-0 flex-shrink-0 w-32">
              {field.label}
            </label>
            <Input
              value={(fieldSetData[field.name] as string) || ""}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              className="flex-1"
              type={field.type}
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
