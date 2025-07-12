import React, { useState, useCallback, useEffect } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { RunLogDialog } from "@/components/RunLogDialog";
import { EvalGridMui } from "@/components/EvalGridMui";
import { RunResultsView } from "@/components/RunResultsView";
import { ModelChooser } from "@/components/ModelChooser";
import { PromptChooser } from "@/components/PromptChooser";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useSettings } from "@/hooks/useSettings";
import {
  getMostRecentRunFieldSetId,
  getMostRecentRunWithPromptAndModel,
} from "@/lib/runUtils";
import { runPrompt } from "@/lib/runPrompt";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export const EvalTab: React.FC = () => {
  const [splitPosition, setSplitPosition] = useLocalStorage<number[]>(
    "evalTabSplitPosition",
    [60, 40]
  );

  const [selectedBookId, setSelectedBookId] = useLocalStorage<number | null>(
    "selectedBookId",
    null
  );
  const [selectedBookData, setSelectedBookData] = useState<{
    runId: number | null;
  } | null>(null);

  // State for tracking selected books for running tests
  const [selectedForRun, setSelectedForRun] = useState<number[]>([]);
  const [selectedBooksData, setSelectedBooksData] = useState<
    Array<{ id: number; label: string | null }>
  >([]);
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [runLog, setRunLog] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Add refresh trigger

  // Get OpenRouter API key from settings
  const { openRouterApiKey } = useSettings();

  // Get selected prompt and model from their respective localStorage keys
  const [selectedPromptId] = useLocalStorage<number | null>(
    "currentPromptId",
    null
  );
  const [selectedModel] = useLocalStorage<string>(
    "selectedModel",
    "google/gemini-flash-1.5"
  );

  // Handle row selection from the grid
  const handleRowSelectionChange = useCallback(
    async (bookId: number | null) => {
      setSelectedBookId(bookId);

      if (!bookId) {
        setSelectedBookData(null);
        return;
      }

      try {
        // Get the book input data to find correct_fields
        const { data: bookInput, error } = await supabase
          .from("book-input")
          .select("correct_fields")
          .eq("id", bookId)
          .single();

        if (error) {
          console.error("Error fetching book input:", error);
          setSelectedBookData(null);
          return;
        }

        // Get the most recent run that matches the selected prompt and model
        const recentRun = await getMostRecentRunWithPromptAndModel(
          bookId,
          selectedPromptId,
          selectedModel
        );

        setSelectedBookData({
          runId: recentRun?.id || null,
        });
      } catch (error) {
        console.error("Error loading book data:", error);
        setSelectedBookData(null);
      }
    },
    [setSelectedBookId, selectedPromptId, selectedModel]
  );

  // Handle checkbox selection change from the grid
  const handleCheckboxSelectionChange = useCallback(
    async (selectedIds: number[]) => {
      console.log("Selected IDs:", selectedIds);
      setSelectedForRun(selectedIds);
      // Fetch book data for selected books
      if (selectedIds.length > 0) {
        try {
          const { data: booksData, error } = await supabase
            .from("book-input")
            .select("id, label")
            .in("id", selectedIds);
          if (error) {
            console.error("Error fetching selected books data:", error);
            setSelectedBooksData([]);
          } else {
            setSelectedBooksData(booksData || []);
          }
        } catch (error) {
          console.error("Error fetching selected books data:", error);
          setSelectedBooksData([]);
        }
      } else {
        setSelectedBooksData([]);
      }
    },
    []
  );

  // Handle running tests
  const handleRunTests = useCallback(async () => {
    // Determine what books to run: either selected checkboxes or the single selected row
    let booksToRun: Array<{ id: number; label: string | null }> = [];

    if (selectedForRun.length > 0) {
      // Use checkbox selections
      booksToRun = selectedBooksData;
    } else if (selectedBookId) {
      // Use the single selected row - fetch its data
      try {
        const { data: bookData, error } = await supabase
          .from("book-input")
          .select("id, label")
          .eq("id", selectedBookId)
          .single();

        if (error || !bookData) {
          console.error("Error fetching selected book data:", error);
          setRunLog(["❌ Error: Could not fetch selected book data."]);
          setRunDialogOpen(true);
          return;
        }

        booksToRun = [bookData];
      } catch (error) {
        console.error("Error fetching selected book data:", error);
        setRunLog(["❌ Error: Could not fetch selected book data."]);
        setRunDialogOpen(true);
        return;
      }
    } else {
      // Nothing to run
      return;
    }

    // Validate required settings
    if (!openRouterApiKey) {
      console.error("OpenRouter API key is required");
      setRunLog([
        "❌ Error: OpenRouter API key is required. Please set it in Settings.",
      ]);
      setRunDialogOpen(true);
      return;
    }

    if (!selectedPromptId) {
      console.error("Prompt selection is required");
      setRunLog(["❌ Error: Please select a prompt to run."]);
      setRunDialogOpen(true);
      return;
    }

    if (!selectedModel) {
      console.error("Model selection is required");
      setRunLog(["❌ Error: Please select a model to run."]);
      setRunDialogOpen(true);
      return;
    }

    setRunDialogOpen(true);
    setIsRunning(true);
    setRunLog([]);

    try {
      const log: string[] = [];
      log.push(
        `Starting test run for ${booksToRun.length} test book${
          booksToRun.length === 1 ? "" : "s"
        }...`
      );
      log.push(`Using model: ${selectedModel}`);
      log.push(""); // Empty line for spacing
      setRunLog([...log]);

      // First, get the prompt details
      const { data: promptData, error: promptError } = await supabase
        .from("prompt")
        .select("*")
        .eq("id", selectedPromptId)
        .single();

      if (promptError || !promptData) {
        throw new Error(`Failed to fetch prompt: ${promptError?.message}`);
      }

      if (!promptData.user_prompt) {
        throw new Error("Selected prompt has no content");
      }

      log.push(`Using prompt: ${promptData.label || "Untitled"}`);
      log.push(""); // Empty line for spacing
      setRunLog([...log]);

      const promptSettings = {
        promptText: promptData.user_prompt,
        temperature: promptData.temperature || 0.0,
      };

      // Run tests for each selected book
      for (const bookData of booksToRun) {
        const label = bookData.label || `Book ${bookData.id}`;
        log.push(`Running test for: ${label}`);
        setRunLog([...log]);

        try {
          // Get the book input data
          const { data: bookInputData, error: bookInputError } = await supabase
            .from("book-input")
            .select("*")
            .eq("id", bookData.id)
            .single();

          if (bookInputError || !bookInputData) {
            throw new Error(
              `Failed to fetch book input: ${bookInputError?.message}`
            );
          }

          if (!bookInputData.ocr_markdown) {
            log.push(`  - ⚠️ Warning: No OCR markdown content for ${label}`);
            setRunLog([...log]);
            continue;
          }

          // Create an AbortController for this run
          const abortController = new AbortController();

          // Run the prompt without streaming
          const result = await runPrompt(
            selectedPromptId,
            bookData.id,
            openRouterApiKey,
            promptSettings,
            selectedModel,
            bookInputData.ocr_markdown,
            abortController.signal
            // No onStream callback - we're running without streaming
          );

          log.push(`  - ✅ Completed successfully`);
          log.push(`  - Run ID: ${result.run.id}`);
          log.push(`  - Model: ${result.run.model}`);
          log.push(`  - Temperature: ${result.run.temperature}`);
          if (result.usage) {
            log.push(
              `  - Tokens used: ${result.usage.totalTokens} (${result.usage.promptTokens} prompt + ${result.usage.completionTokens} completion)`
            );
          }
          log.push(""); // Empty line for spacing
          setRunLog([...log]);
        } catch (error) {
          console.error(`Error running test for ${label}:`, error);
          log.push(`  - ❌ Error: ${error}`);
          log.push(""); // Empty line for spacing
          setRunLog([...log]);
        }
      }

      log.push("✅ Test run completed!");
      setRunLog([...log]);

      // Trigger a refresh of the grid data to update "Last Test" column
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Error running tests:", error);
      setRunLog((prev) => [...prev, `❌ Error: ${error}`]);

      // Still trigger a refresh in case some tests completed successfully
      setRefreshTrigger((prev) => prev + 1);
    } finally {
      setIsRunning(false);
    }
  }, [
    selectedForRun,
    selectedBooksData,
    selectedBookId,
    openRouterApiKey,
    selectedPromptId,
    selectedModel,
  ]);

  // Close run dialog
  const handleCloseRunDialog = useCallback(() => {
    setRunDialogOpen(false);
    setRunLog([]);
    setIsRunning(false);
  }, []);

  // Refresh the evaluation grid when prompt or model changes
  useEffect(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, [selectedPromptId, selectedModel]);

  return (
    <div className="h-full w-full">
      <ResizablePanelGroup
        direction="horizontal"
        onLayout={setSplitPosition}
        className="h-full"
      >
        <ResizablePanel defaultSize={splitPosition[0]} minSize={30}>
          <div className="h-full flex flex-col">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                Test Book Evaluations
              </h2>
              <div className="flex items-center space-x-3">
                {" "}
                <PromptChooser placeholder="Select prompt..." />
                <ModelChooser className="ml-auto" />
                <Button
                  onClick={handleRunTests}
                  disabled={selectedForRun.length === 0 && !selectedBookId}
                  variant="default"
                  size="sm"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Run (
                  {selectedForRun.length > 0
                    ? selectedForRun.length
                    : selectedBookId
                    ? 1
                    : 0}
                  )
                </Button>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <EvalGridMui
                onRowSelectionChange={handleRowSelectionChange}
                onCheckboxSelectionChange={handleCheckboxSelectionChange}
                refreshTrigger={refreshTrigger}
              />
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={splitPosition[1]} minSize={20}>
          <div className="h-full flex flex-col bg-blue-100 p-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Evaluation Details
            </h2>

            {selectedBookData ? (
              <RunResultsView
                runId={selectedBookData.runId}
                defaultOutput="fields"
              />
            ) : (
              <div className="flex-1 p-4 overflow-auto">
                <div className="text-center text-gray-500 mt-8">
                  <h3 className="text-lg font-medium mb-2">
                    Select a test book
                  </h3>
                </div>
              </div>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      {/* Run Dialog */}
      <RunLogDialog
        open={runDialogOpen}
        onOpenChange={setRunDialogOpen}
        selectedCount={selectedForRun.length}
        runLog={runLog}
        isRunning={isRunning}
        onClose={handleCloseRunDialog}
      />
    </div>
  );
};
