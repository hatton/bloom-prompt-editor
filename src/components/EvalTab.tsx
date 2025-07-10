import React, { useState, useCallback } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { RunLogDialog } from "@/components/RunLogDialog";
import { EvalGridMui } from "@/components/EvalGridMui";
import { FieldView } from "@/components/FieldView";
import { ModelChooser } from "@/components/ModelChooser";
import { PromptChooser } from "@/components/PromptChooser";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { getMostRecentRunFieldSetId } from "@/lib/runUtils";
import { supabase } from "@/integrations/supabase/client";

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
    correctFieldSetId: number | null;
    recentRunFieldSetId: number | null;
  } | null>(null);

  // State for tracking selected books for running tests
  const [selectedForRun, setSelectedForRun] = useState<number[]>([]);
  const [selectedBooksData, setSelectedBooksData] = useState<
    Array<{ id: number; label: string | null }>
  >([]);
  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [runLog, setRunLog] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

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

        // Get the most recent run's field-set ID
        const recentRunFieldSetId = await getMostRecentRunFieldSetId(bookId);

        setSelectedBookData({
          correctFieldSetId: bookInput.correct_fields,
          recentRunFieldSetId,
        });
      } catch (error) {
        console.error("Error loading book data:", error);
        setSelectedBookData(null);
      }
    },
    [setSelectedBookId]
  );

  // Handle checkbox selection change from the grid
  const handleCheckboxSelectionChange = useCallback(
    async (selectedIds: number[]) => {
      console.log("Selected IDs:", selectedIds);
      //     setSelectedForRun(selectedIds);
      //     // Fetch book data for selected books
      //     if (selectedIds.length > 0) {
      //       try {
      //         const { data: booksData, error } = await supabase
      //           .from("book-input")
      //           .select("id, label")
      //           .in("id", selectedIds);
      //         if (error) {
      //           console.error("Error fetching selected books data:", error);
      //           setSelectedBooksData([]);
      //         } else {
      //           setSelectedBooksData(booksData || []);
      //         }
      //       } catch (error) {
      //         console.error("Error fetching selected books data:", error);
      //         setSelectedBooksData([]);
      //       }
      //     } else {
      //       setSelectedBooksData([]);
      //     }
    },
    []
  );

  // Handle running tests
  const handleRunTests = useCallback(async () => {
    if (selectedForRun.length === 0) return;

    setRunDialogOpen(true);
    setIsRunning(true);
    setRunLog([]);

    try {
      const log: string[] = [];
      log.push(`Starting test run for ${selectedForRun.length} test books...`);
      log.push(""); // Empty line for spacing
      setRunLog([...log]);

      // Simulate running tests for each selected book
      for (const bookData of selectedBooksData) {
        const label = bookData.label || `Book ${bookData.id}`;
        log.push(`Running test for: ${label}`);
        setRunLog([...log]);

        // Simulate some processing time
        await new Promise((resolve) => setTimeout(resolve, 800));

        // For now, just log the book label as requested
        log.push(`  - Test book label: ${label}`);
        log.push(`  - Book ID: ${bookData.id}`);
        log.push(`  - Status: Completed`);
        log.push(""); // Empty line for spacing
        setRunLog([...log]);
      }

      log.push("✅ Test run completed successfully!");
      setRunLog([...log]);
    } catch (error) {
      console.error("Error running tests:", error);
      setRunLog((prev) => [...prev, `❌ Error: ${error}`]);
    } finally {
      setIsRunning(false);
    }
  }, [selectedForRun, selectedBooksData]);

  // Close run dialog
  const handleCloseRunDialog = useCallback(() => {
    setRunDialogOpen(false);
    setRunLog([]);
    setIsRunning(false);
  }, []);

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
                <Button
                  onClick={handleRunTests}
                  disabled={selectedForRun.length === 0}
                  variant="default"
                  size="sm"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Run ({selectedForRun.length})
                </Button>
                <PromptChooser placeholder="Select prompt..." />
                <ModelChooser className="ml-auto" />
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <EvalGridMui
                onRowSelectionChange={handleRowSelectionChange}
                onCheckboxSelectionChange={handleCheckboxSelectionChange}
              />
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        <ResizablePanel defaultSize={splitPosition[1]} minSize={20}>
          <div className="h-full flex flex-col">
            <div className="p-4 border-b bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">
                Evaluation Details
              </h2>
            </div>

            {selectedBookData ? (
              <FieldView
                correctFieldSetId={selectedBookData.correctFieldSetId}
                resultFieldSetId={selectedBookData.recentRunFieldSetId}
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
