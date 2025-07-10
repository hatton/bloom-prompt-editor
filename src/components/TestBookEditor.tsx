import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { InlineToast } from "@/components/ui/inline-toast";
import { Clipboard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { FieldSetEditor } from "@/components/FieldSetEditor";

type BookInput = Tables<"book-input">;

interface InputBookEditorProps {
  inputId: number;
  onInputUpdate?: (input: BookInput) => void;
}

export const InputBookEditor = ({
  inputId,
  onInputUpdate,
}: InputBookEditorProps) => {
  const [input, setInput] = useState<BookInput | null>(null);
  const [currentLabel, setCurrentLabel] = useState("");
  const [currentMarkdown, setCurrentMarkdown] = useState("");
  const [currentReferenceMarkdown, setCurrentReferenceMarkdown] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Inline toast state
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [savedToastMessage, setSavedToastMessage] = useState("");
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [errorToastMessage, setErrorToastMessage] = useState("");
  const [toastFieldType, setToastFieldType] = useState<
    "label" | "ocr_markdown" | "reference_markdown" | null
  >(null);

  // Track original values to detect changes
  const [originalLabel, setOriginalLabel] = useState("");
  const [originalMarkdown, setOriginalMarkdown] = useState("");
  const [originalReferenceMarkdown, setOriginalReferenceMarkdown] =
    useState("");

  // Load input data when inputId changes
  useEffect(() => {
    const loadInput = async () => {
      if (!inputId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("book-input")
          .select("*")
          .eq("id", inputId)
          .single();

        if (error) throw error;

        if (data) {
          const label = data.label || "";
          const markdown = data.ocr_markdown || "";
          const referenceMarkdown = data.reference_markdown || "";

          setInput(data);
          setCurrentLabel(label);
          setCurrentMarkdown(markdown);
          setCurrentReferenceMarkdown(referenceMarkdown);
          setHasUnsavedChanges(false);

          // Set original values
          setOriginalLabel(label);
          setOriginalMarkdown(markdown);
          setOriginalReferenceMarkdown(referenceMarkdown);
        }
      } catch (error) {
        console.error("Error loading input:", error);
        toast({
          title: "Error loading input",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadInput();
  }, [inputId, toast]);

  // Save changes before unmounting or input change
  useEffect(() => {
    return () => {
      // Save changes when component unmounts or input changes
      if (hasUnsavedChanges && inputId) {
        const saveData = async () => {
          try {
            await supabase
              .from("book-input")
              .update({
                label: currentLabel,
                ocr_markdown: currentMarkdown,
                reference_markdown: currentReferenceMarkdown,
              })
              .eq("id", inputId);
          } catch (error) {
            console.error("Error saving before unmount:", error);
          }
        };
        saveData();
      }
    };
  }, [
    inputId,
    hasUnsavedChanges,
    currentLabel,
    currentMarkdown,
    currentReferenceMarkdown,
  ]);

  const handleLabelChange = (value: string) => {
    setCurrentLabel(value);
    setHasUnsavedChanges(true);
  };

  const handleMarkdownChange = (value: string) => {
    setCurrentMarkdown(value);
    setHasUnsavedChanges(true);
  };

  const handleReferenceMarkdownChange = (value: string) => {
    setCurrentReferenceMarkdown(value);
    setHasUnsavedChanges(true);
  };

  // Handle field set updates from the FieldSetEditor component
  const handleFieldSetUpdate = (fieldSetId: number) => {
    if (input) {
      const updatedInput = { ...input, correct_fields: fieldSetId };
      setInput(updatedInput);
      onInputUpdate?.(updatedInput);
    }
  };

  // Individual save functions for each field
  const saveIfChanged = async (
    fieldName: string,
    currentValue: string,
    originalValue: string
  ) => {
    if (currentValue !== originalValue && inputId) {
      try {
        const updateData: Record<string, string> = {};

        if (fieldName === "label") {
          updateData.label = currentValue;
          setOriginalLabel(currentValue);
        } else if (fieldName === "ocr_markdown") {
          updateData.ocr_markdown = currentValue;
          setOriginalMarkdown(currentValue);
        } else if (fieldName === "reference_markdown") {
          updateData.reference_markdown = currentValue;
          setOriginalReferenceMarkdown(currentValue);
        }

        const { error } = await supabase
          .from("book-input")
          .update(updateData)
          .eq("id", inputId);

        if (error) throw error;

        // Update local input state
        if (input) {
          const updatedInput = { ...input, ...updateData };
          setInput(updatedInput);
          onInputUpdate?.(updatedInput);
        }

        // Check if all fields are now saved
        const updatedOriginalLabel =
          fieldName === "label" ? currentValue : originalLabel;
        const updatedOriginalMarkdown =
          fieldName === "ocr_markdown" ? currentValue : originalMarkdown;
        const updatedOriginalReferenceMarkdown =
          fieldName === "reference_markdown"
            ? currentValue
            : originalReferenceMarkdown;

        const allSaved =
          currentLabel === updatedOriginalLabel &&
          currentMarkdown === updatedOriginalMarkdown &&
          currentReferenceMarkdown === updatedOriginalReferenceMarkdown;

        if (allSaved) {
          setHasUnsavedChanges(false);
        }

        setSavedToastMessage(
          `${fieldName
            .replace("_", " ")
            .replace(/\b\w/g, (l) => l.toUpperCase())} saved`
        );
        setToastFieldType(
          fieldName as "label" | "ocr_markdown" | "reference_markdown"
        );
        setShowSavedToast(true);
      } catch (error) {
        console.error(`Error saving ${fieldName}:`, error);
        setErrorToastMessage(`Error saving ${fieldName.replace("_", " ")}`);
        setToastFieldType(
          fieldName as "label" | "ocr_markdown" | "reference_markdown"
        );
        setShowErrorToast(true);
      }
    }
  };

  // Blur handlers for each field
  const handleLabelBlur = () => {
    saveIfChanged("label", currentLabel, originalLabel);
  };

  const handleMarkdownBlur = () => {
    saveIfChanged("ocr_markdown", currentMarkdown, originalMarkdown);
  };

  const handleReferenceMarkdownBlur = () => {
    saveIfChanged(
      "reference_markdown",
      currentReferenceMarkdown,
      originalReferenceMarkdown
    );
  };

  const handleToastClose = () => {
    setShowSavedToast(false);
    setShowErrorToast(false);
    setToastFieldType(null);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setCurrentMarkdown(text);
      setHasUnsavedChanges(true);
      toast({
        title: "Content pasted",
      });
    } catch (err) {
      toast({
        title: "Failed to paste content",
        variant: "destructive",
      });
    }
  };

  const handleReferencePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setCurrentReferenceMarkdown(text);
      setHasUnsavedChanges(true);
      toast({
        title: "Reference content pasted",
      });
    } catch (err) {
      toast({
        title: "Failed to paste content",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <p className="text-lg">Loading input...</p>
        </div>
      </div>
    );
  }

  if (!input) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-gray-500">
          <p className="text-lg">Input not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          {hasUnsavedChanges && (
            <span className="text-sm text-amber-600">Unsaved changes</span>
          )}
        </div>

        <div className="mb-4">
          <div className="relative w-[40em] font-bold">
            <Input
              value={currentLabel}
              onChange={(e) => handleLabelChange(e.target.value)}
              onBlur={handleLabelBlur}
              placeholder="Enter input label..."
              className="w-full font-bold"
            />
            {/* Toast for Label field */}
            {toastFieldType === "label" && (
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
      </div>

      <div className="flex-1 overflow-y-auto px-6">
        <div className="space-y-6 ">
          {/* OCR Markdown and Reference Markdown Side by Side */}
          <div className="grid grid-cols-2 gap-6">
            {/* OCR Markdown Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  OCR Markdown
                </label>
                <Button variant="ghost" size="sm" onClick={handlePaste}>
                  <Clipboard className="w-4 h-4" />
                </Button>
              </div>
              <div className="relative">
                <Textarea
                  value={currentMarkdown}
                  onChange={(e) => handleMarkdownChange(e.target.value)}
                  onBlur={handleMarkdownBlur}
                  placeholder="Enter your OCR markdown content here..."
                  className="resize-none font-mono text-sm h-[400px]"
                />
                {/* Toast for OCR Markdown field */}
                {toastFieldType === "ocr_markdown" && (
                  <div className="absolute bottom-2 right-2 z-10">
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

            {/* Reference Markdown Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  Optional Reference Markdown (i.e. the "correct" answer)
                </label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReferencePaste}
                >
                  <Clipboard className="w-4 h-4" />
                </Button>
              </div>
              <div className="relative">
                <Textarea
                  value={currentReferenceMarkdown}
                  onChange={(e) =>
                    handleReferenceMarkdownChange(e.target.value)
                  }
                  onBlur={handleReferenceMarkdownBlur}
                  placeholder="Enter your reference markdown content here..."
                  className="resize-none font-mono text-sm h-[400px]"
                />
                {/* Toast for Reference Markdown field */}
                {toastFieldType === "reference_markdown" && (
                  <div className="absolute bottom-2 right-2 z-10">
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
          </div>

          {/* Field Set Section */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Correct Fields
            </label>
            <FieldSetEditor
              selectedInputId={inputId}
              fieldSetId={input?.correct_fields || null}
              onFieldSetUpdate={handleFieldSetUpdate}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
