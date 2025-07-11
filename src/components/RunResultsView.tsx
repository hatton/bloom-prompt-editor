import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DiffView } from "@/components/DiffView";
import { FieldsComparisonView } from "@/components/FieldsComparisonView";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Run = Tables<"run">;

type BookInput = Tables<"book-input">;

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
  const [runData, setRunData] = useState<Run | null>(null);
  const [bookInputData, setBookInputData] = useState<BookInput | null>(null);
  const [loading, setLoading] = useState(false);
  const [comparisonMode, setComparisonMode] = useState("output");

  useEffect(() => {
    const fetchRunData = async () => {
      if (!runId) {
        setRunData(null);
        setBookInputData(null);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("run")
          .select("*")
          .eq("id", runId)
          .single();

        if (error) {
          console.error("Error fetching run data:", error);
          setRunData(null);
          setBookInputData(null);
        } else {
          setRunData(data);

          // Fetch book input data if available
          if (data.book_input_id) {
            const { data: bookData, error: bookError } = await supabase
              .from("book-input")
              .select("*")
              .eq("id", data.book_input_id)
              .single();

            if (bookError) {
              console.error("Error fetching book input data:", bookError);
              setBookInputData(null);
            } else {
              setBookInputData(bookData);
            }
          } else {
            setBookInputData(null);
          }
        }
      } catch (error) {
        console.error("Error fetching run data:", error);
        setRunData(null);
        setBookInputData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRunData();
  }, [runId]);

  const handleTabChange = (value: string) => {
    if (value === "fields" || value === "markdown") {
      setActiveTab(value);
    }
  };

  const handleCopyOutput = () => {
    if (runData?.output) {
      navigator.clipboard.writeText(runData.output);
    }
  };

  if (!runId) {
    return (
      <div className="flex-1 p-4 flex items-center justify-center">
        <p className="text-gray-500">No run selected</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 p-4 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-blue-50 border border-green-500">
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
          {runData?.output ? (
            <DiffView
              output={runData.output}
              comparisonMode={comparisonMode}
              hasReferenceMarkdown={!!bookInputData?.reference_markdown}
              markdownOfSelectedInput={bookInputData?.ocr_markdown || ""}
              referenceMarkdown={bookInputData?.reference_markdown || ""}
              onComparisonModeChange={setComparisonMode}
              onCopyOutput={handleCopyOutput}
            />
          ) : (
            <div className="flex-1 p-4 flex items-center justify-center">
              <p className="text-gray-500">No output available</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
