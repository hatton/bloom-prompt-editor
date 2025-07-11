import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MarkdownDiffView } from "@/components/MarkdownDiffView";
import { FieldsComparisonView } from "@/components/FieldsComparisonView";

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
    return (
      <div className="flex-1 p-4 flex items-center justify-center">
        <p className="text-gray-500">No run selected</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex-1 flex flex-col min-h-0 h-full"
      >
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
