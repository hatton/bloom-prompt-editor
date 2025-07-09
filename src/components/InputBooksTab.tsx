import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { InlineToast } from "@/components/ui/inline-toast";
import { Plus, Trash2, Clipboard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { FieldSetEditor } from "@/components/FieldSetEditor";

type BookInput = Tables<"book-input">;

export const InputBooksTab = () => {
  const [bookInputs, setBookInputs] = useState<BookInput[]>([]);
  const [selectedInputId, setSelectedInputId] = useState<number | null>(null);
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

  const loadBookInputs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("book-input")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setBookInputs(data || []);
      if (data && data.length > 0 && !selectedInputId) {
        setSelectedInputId(data[0].id);
      }
    } catch (error) {
      console.error("Error loading book inputs:", error);
      toast({
        title: "Error loading inputs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedInputId, toast]);

  // Load book inputs from Supabase
  useEffect(() => {
    loadBookInputs();
  }, [loadBookInputs]);

  // Load selected input data
  useEffect(() => {
    if (selectedInputId) {
      const selectedInput = bookInputs.find(
        (input) => input.id === selectedInputId
      );
      if (selectedInput) {
        const label = selectedInput.label || "";
        const markdown = selectedInput.ocr_markdown || "";
        const referenceMarkdown = selectedInput.reference_markdown || "";

        setCurrentLabel(label);
        setCurrentMarkdown(markdown);
        setCurrentReferenceMarkdown(referenceMarkdown);
        setHasUnsavedChanges(false);

        // Set original values
        setOriginalLabel(label);
        setOriginalMarkdown(markdown);
        setOriginalReferenceMarkdown(referenceMarkdown);
      }
    }
  }, [selectedInputId, bookInputs]);

  const saveCurrentInput = useCallback(
    async (showToast = false) => {
      if (selectedInputId) {
        try {
          const { error } = await supabase
            .from("book-input")
            .update({
              label: currentLabel,
              ocr_markdown: currentMarkdown,
              reference_markdown: currentReferenceMarkdown,
            })
            .eq("id", selectedInputId);

          if (error) throw error;

          setBookInputs((prev) =>
            prev.map((input) =>
              input.id === selectedInputId
                ? {
                    ...input,
                    label: currentLabel,
                    ocr_markdown: currentMarkdown,
                    reference_markdown: currentReferenceMarkdown,
                  }
                : input
            )
          );
          setHasUnsavedChanges(false);

          if (showToast) {
            setSavedToastMessage("Input saved");
            setShowSavedToast(true);
          }

          // Update original values after successful save
          setOriginalLabel(currentLabel);
          setOriginalMarkdown(currentMarkdown);
          setOriginalReferenceMarkdown(currentReferenceMarkdown);
        } catch (error) {
          console.error("Error saving input:", error);
          if (showToast) {
            setErrorToastMessage("Error saving input");
            setShowErrorToast(true);
          }
        }
      }
    },
    [currentLabel, currentMarkdown, currentReferenceMarkdown, selectedInputId]
  );

  // Save changes before switching inputs or unmounting
  useEffect(() => {
    const previousInputIdRef = { current: selectedInputId };

    return () => {
      // Save changes when component unmounts or input changes
      if (hasUnsavedChanges && previousInputIdRef.current) {
        const saveData = async () => {
          try {
            await supabase
              .from("book-input")
              .update({
                label: currentLabel,
                ocr_markdown: currentMarkdown,
                reference_markdown: currentReferenceMarkdown,
              })
              .eq("id", previousInputIdRef.current);
          } catch (error) {
            console.error("Error saving before unmount:", error);
          }
        };
        saveData();
      }
    };
  }, [
    selectedInputId,
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
    setBookInputs((prev) =>
      prev.map((input) =>
        input.id === selectedInputId
          ? { ...input, correct_fields: fieldSetId }
          : input
      )
    );
  };

  // Individual save functions for each field
  const saveIfChanged = async (
    fieldName: string,
    currentValue: string,
    originalValue: string
  ) => {
    if (currentValue !== originalValue && selectedInputId) {
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
          .eq("id", selectedInputId);

        if (error) throw error;

        // Update local state
        setBookInputs((prev) =>
          prev.map((input) =>
            input.id === selectedInputId ? { ...input, ...updateData } : input
          )
        );

        // Check if all fields are now saved by comparing current values with what they will be after this save
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

  const handleInputSelection = async (inputId: number) => {
    // Save current changes before switching if any
    if (hasUnsavedChanges && selectedInputId) {
      await saveCurrentInput(false);
    }
    setSelectedInputId(inputId);
  };

  const addNewInput = async () => {
    try {
      const { data, error } = await supabase
        .from("book-input")
        .insert({
          label: "New Input",
          ocr_markdown:
            "# New Input\n\nStart typing your markdown content here...",
          reference_markdown: "# Reference\n\nAdd reference content here...",
        })
        .select()
        .single();

      if (error) throw error;

      setBookInputs((prev) => [data, ...prev]);
      setSelectedInputId(data.id);
      toast({
        title: "New input created",
      });
    } catch (error) {
      console.error("Error creating input:", error);
      toast({
        title: "Error creating input",
        variant: "destructive",
      });
    }
  };

  const deleteInput = async (inputId: number) => {
    if (bookInputs.length <= 1) {
      toast({
        title: "Cannot delete the last input",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("book-input")
        .delete()
        .eq("id", inputId);

      if (error) throw error;

      setBookInputs((prev) => prev.filter((input) => input.id !== inputId));

      if (selectedInputId === inputId) {
        const remainingInputs = bookInputs.filter(
          (input) => input.id !== inputId
        );
        setSelectedInputId(remainingInputs[0]?.id || null);
      }

      toast({
        title: "Input deleted",
      });
    } catch (error) {
      console.error("Error deleting input:", error);
      toast({
        title: "Error deleting input",
        variant: "destructive",
      });
    }
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

  const selectedInput = bookInputs.find(
    (input) => input.id === selectedInputId
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p className="text-lg">Loading inputs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Sidebar - Input List */}
      <div className="w-80 bg-blue-200 flex flex-col">
        <div className="p-4 border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <Button
              onClick={addNewInput}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-2 overflow-y-auto flex-1">
          {bookInputs.map((input) => (
            <Card
              key={input.id}
              className={`p-3 cursor-pointer transition-all group bg-gray-50 ${
                selectedInputId === input.id
                  ? "bg-white border-blue-600 shadow-sm border-[3px]"
                  : "hover:bg-gray-50"
              }`}
              onClick={() => handleInputSelection(input.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {input.label || "Untitled"}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(input.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteInput(input.id);
                  }}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Main Content - Editor */}
      <div className="flex-1 flex flex-col bg-blue-100">
        {selectedInput ? (
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold text-gray-900">
                  Edit Input
                </h2>
                {hasUnsavedChanges && (
                  <span className="text-sm text-amber-600">
                    Unsaved changes
                  </span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Label
                </label>
                <div className="relative w-[20em]">
                  <Input
                    value={currentLabel}
                    onChange={(e) => handleLabelChange(e.target.value)}
                    onBlur={handleLabelBlur}
                    placeholder="Enter input label..."
                    className="w-full"
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

            <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
              {/* OCR Markdown Section */}
              <div className="flex flex-col min-h-[200px]">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    OCR Markdown
                  </label>
                  <Button variant="outline" size="sm" onClick={handlePaste}>
                    <Clipboard className="w-4 h-4" />
                  </Button>
                </div>
                <div className="relative flex-1 flex">
                  <Textarea
                    value={currentMarkdown}
                    onChange={(e) => handleMarkdownChange(e.target.value)}
                    onBlur={handleMarkdownBlur}
                    placeholder="Enter your OCR markdown content here..."
                    className="flex-1 resize-none font-mono text-sm min-h-[200px]"
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
              <div className="flex flex-col min-h-[200px]">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Optional Reference Markdown (i.e. the "correct" answer)
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReferencePaste}
                  >
                    <Clipboard className="w-4 h-4" />
                  </Button>
                </div>
                <div className="relative flex-1 flex">
                  <Textarea
                    value={currentReferenceMarkdown}
                    onChange={(e) =>
                      handleReferenceMarkdownChange(e.target.value)
                    }
                    onBlur={handleReferenceMarkdownBlur}
                    placeholder="Enter your reference markdown content here..."
                    className="flex-1 resize-none font-mono text-sm min-h-[200px]"
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

              {/* Field Set Section */}
              <FieldSetEditor
                selectedInputId={selectedInputId}
                fieldSetId={selectedInput?.correct_fields || null}
                onFieldSetUpdate={handleFieldSetUpdate}
              />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <p className="text-lg">Select an input to edit</p>
              <p className="text-sm mt-2">
                Choose an input from the sidebar to start editing
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
