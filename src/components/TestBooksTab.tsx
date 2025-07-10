import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { InputBookEditor } from "@/components/TestBookEditor";

type BookInput = Tables<"book-input">;

export const TestBooksTab = () => {
  const [bookInputs, setBookInputs] = useState<BookInput[]>([]);
  const [selectedBookId, setSelectedBookId] = useLocalStorage<number | null>(
    "selectedBookId",
    null
  );
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadBookInputs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("book-input")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Sort alphabetically by label
      const sortedData = (data || []).sort((a, b) => {
        const labelA = (a.label || "").toLowerCase();
        const labelB = (b.label || "").toLowerCase();
        return labelA.localeCompare(labelB);
      });

      setBookInputs(sortedData);
      if (sortedData && sortedData.length > 0 && !selectedBookId) {
        setSelectedBookId(sortedData[0].id);
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
  }, [selectedBookId, setSelectedBookId, toast]);

  // Load book inputs from Supabase
  useEffect(() => {
    loadBookInputs();
  }, [loadBookInputs]);

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

      setBookInputs((prev) => {
        const newInputs = [data, ...prev];
        // Sort alphabetically by label
        return newInputs.sort((a, b) => {
          const labelA = (a.label || "").toLowerCase();
          const labelB = (b.label || "").toLowerCase();
          return labelA.localeCompare(labelB);
        });
      });
      setSelectedBookId(data.id);
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

      if (selectedBookId === inputId) {
        const remainingInputs = bookInputs.filter(
          (input) => input.id !== inputId
        );
        setSelectedBookId(remainingInputs[0]?.id || null);
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

  const handleInputSelection = (inputId: number) => {
    setSelectedBookId(inputId);
  };

  // Handle input updates from the editor
  const handleInputUpdate = (updatedInput: BookInput) => {
    setBookInputs((prev) => {
      const updatedInputs = prev.map((input) =>
        input.id === updatedInput.id ? updatedInput : input
      );
      // Sort alphabetically by label after update
      return updatedInputs.sort((a, b) => {
        const labelA = (a.label || "").toLowerCase();
        const labelB = (b.label || "").toLowerCase();
        return labelA.localeCompare(labelB);
      });
    });
  };

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
      <div className="w-80 bg-blue-100 flex flex-col">
        <div className="p-3 border-gray-200">
          <div className="flex items-center justify-between">
            <Button
              onClick={addNewInput}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
            <span className="text-sm text-gray-600">
              {bookInputs.length} book{bookInputs.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="px-3 pb-3 space-y-1 overflow-y-auto flex-1">
          {bookInputs.map((input) => (
            <div
              key={input.id}
              className={`px-3 py-2 cursor-pointer transition-all group rounded-md ${
                selectedBookId === input.id
                  ? "bg-white border-blue-600 shadow-sm border-2"
                  : "hover:bg-gray-50 border border-transparent"
              }`}
              onClick={() => handleInputSelection(input.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {input.label || "Untitled"}
                  </h4>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteInput(input.id);
                  }}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content - Editor */}
      <div className="flex-1 flex flex-col bg-blue-100">
        {selectedBookId ? (
          <InputBookEditor
            inputId={selectedBookId}
            onInputUpdate={handleInputUpdate}
          />
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
