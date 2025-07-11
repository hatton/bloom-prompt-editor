import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarkdownDiffView } from "@/components/MarkdownDiffView";
import { FieldsComparisonView } from "@/components/FieldsComparisonView";
import { RunInfo } from "@/components/RunInfo";

interface RunResultsViewProps {
  runId: number | null;
  defaultOutput?: "fields" | "markdown";
}

export const RunResultsView = ({
  runId,
  defaultOutput = "fields",
}: RunResultsViewProps) => {
  const [activeTab, setActiveTab] = useState<"fields" | "markdown">(() => {
    return defaultOutput;
  });

  const handleTabChange = (value: string) => {
    if (value === "fields" || value === "markdown") {
      setActiveTab(value);
    }
  };

  if (!runId) {
    return null;
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex-1 flex flex-col min-h-0 h-full"
      >
        <div className="flex items-center justify-between">
          <TabsList className="flex gap-2 !bg-transparent !border-none !p-0 h-auto justify-start mt-[15px]">
            <TabsTrigger
              value="fields"
              className="px-4 py-2 !bg-transparent data-[state=active]:!bg-white data-[state=active]:!font-bold !border-none !rounded-t-md !rounded-b-none"
            >
              Fields
            </TabsTrigger>
            <TabsTrigger
              value="markdown"
              className="px-4 py-2 !bg-transparent data-[state=active]:!bg-white data-[state=active]:!font-bold !border-none !rounded-t-md !rounded-b-none"
            >
              Markdown
            </TabsTrigger>
          </TabsList>
          {runId && (
            <div className="mt-[15px]">
              <RunInfo runId={runId} />
            </div>
          )}
        </div>
        <TabsContent
          value="fields"
          className="flex-1 min-h-0 !mt-0 h-full flex flex-col data-[state=inactive]:hidden"
        >
          <FieldsComparisonView runId={runId} />
        </TabsContent>
        <TabsContent
          value="markdown"
          className="flex-1 min-h-0 !mt-0 h-full flex flex-col data-[state=inactive]:hidden"
        >
          <MarkdownDiffView runId={runId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
