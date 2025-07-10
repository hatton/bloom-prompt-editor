import React from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { EvalGridMui } from "@/components/EvalGridMui";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export const EvalTab: React.FC = () => {
  const [splitPosition, setSplitPosition] = useLocalStorage<number[]>(
    "evalTabSplitPosition",
    [60, 40]
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
                Input Book Evaluations
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                View and analyze evaluation metrics for all input books
              </p>
            </div>
            <div className="flex-1 min-h-0">
              <EvalGridMui />
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
              <p className="text-sm text-gray-600 mt-1">
                Detailed analysis and insights
              </p>
            </div>
            <div className="flex-1 p-4 overflow-auto">
              <div className="text-center text-gray-500 mt-8">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-lg font-medium mb-2">
                  Select an input book
                </h3>
                <p className="text-sm">
                  Choose an input book from the grid to view detailed evaluation
                  metrics, comparison charts, and improvement suggestions.
                </p>
              </div>

              {/* Placeholder content for future implementation */}
              <div className="mt-8 space-y-4 opacity-50">
                <div className="bg-gray-100 h-32 rounded-lg flex items-center justify-center">
                  <span className="text-gray-500">Accuracy Chart</span>
                </div>
                <div className="bg-gray-100 h-32 rounded-lg flex items-center justify-center">
                  <span className="text-gray-500">Fluency Analysis</span>
                </div>
                <div className="bg-gray-100 h-32 rounded-lg flex items-center justify-center">
                  <span className="text-gray-500">Coherence Metrics</span>
                </div>
              </div>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};
