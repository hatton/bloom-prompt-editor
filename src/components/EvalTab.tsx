import React, { useState, useCallback } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { EvalGridMui } from "@/components/EvalGridMui";
import { FieldView } from "@/components/FieldView";
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

  return (
    <div className="h-full w-full">
      <ResizablePanelGroup
        direction="horizontal"
        onLayout={setSplitPosition}
        className="h-full"
      >
        <ResizablePanel defaultSize={splitPosition[0]} minSize={30}>
          <div className="h-full flex flex-col">
            <div className="p-4 border-b bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">
                Test Book Evaluations
              </h2>
            </div>
            <div className="flex-1 min-h-0">
              <EvalGridMui onRowSelectionChange={handleRowSelectionChange} />
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
    </div>
  );
};
