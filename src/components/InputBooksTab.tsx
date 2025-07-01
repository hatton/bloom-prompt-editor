import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Clipboard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

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
        setCurrentLabel(selectedInput.label || "");
        setCurrentMarkdown(selectedInput.ocr_markdown || "");
        setCurrentReferenceMarkdown(selectedInput.reference_markdown || "");
        setHasUnsavedChanges(false);
      }
    }
  }, [selectedInputId, bookInputs]);

  const saveCurrentInput = useCallback(async () => {
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
        toast({
          title: "Input saved",
          duration: 1000,
        });
      } catch (error) {
        console.error("Error saving input:", error);
        toast({
          title: "Error saving input",
          variant: "destructive",
        });
      }
    }
  }, [
    selectedInputId,
    currentLabel,
    currentMarkdown,
    currentReferenceMarkdown,
    toast,
  ]);

  // Auto-save changes
  useEffect(() => {
    if (hasUnsavedChanges && selectedInputId) {
      const timer = setTimeout(() => {
        saveCurrentInput();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [
    currentLabel,
    currentMarkdown,
    currentReferenceMarkdown,
    hasUnsavedChanges,
    selectedInputId,
    saveCurrentInput,
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
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center text-gray-500">
          <p className="text-lg">Loading inputs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-200px)]">
      {/* Sidebar - Input List */}
      <div className="w-80 border-r border-gray-200 bg-gray-50">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium text-gray-900">Input Books</h3>
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

        <div className="p-4 space-y-2 overflow-y-auto">
          {bookInputs.map((input) => (
            <Card
              key={input.id}
              className={`p-3 cursor-pointer transition-all ${
                selectedInputId === input.id
                  ? "bg-blue-50 border-blue-200 shadow-sm"
                  : "hover:bg-gray-50"
              }`}
              onClick={() => setSelectedInputId(input.id)}
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
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Main Content - Editor */}
      <div className="flex-1 flex flex-col">
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
                <Input
                  value={currentLabel}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  placeholder="Enter input label..."
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex-1 p-6 flex flex-col gap-6">
              {/* OCR Markdown Section */}
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    OCR Markdown
                  </label>
                  <Button variant="outline" size="sm" onClick={handlePaste}>
                    <Clipboard className="w-4 h-4" />
                  </Button>
                </div>
                <Textarea
                  value={currentMarkdown}
                  onChange={(e) => handleMarkdownChange(e.target.value)}
                  placeholder="Enter your OCR markdown content here..."
                  className="flex-1 resize-none font-mono text-sm min-h-[200px]"
                />
              </div>

              {/* Reference Markdown Section */}
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Reference Markdown (i.e. the "correct" answer)
                  </label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReferencePaste}
                  >
                    <Clipboard className="w-4 h-4" />
                  </Button>
                </div>
                <Textarea
                  value={currentReferenceMarkdown}
                  onChange={(e) =>
                    handleReferenceMarkdownChange(e.target.value)
                  }
                  placeholder="Enter your reference markdown content here..."
                  className="flex-1 resize-none font-mono text-sm min-h-[200px]"
                />
              </div>
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
