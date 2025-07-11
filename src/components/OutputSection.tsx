import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ModelChooser } from "@/components/ModelChooser";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Square, Info, AlertTriangle } from "lucide-react";
import { DiffView } from "@/components/DiffView";
import { RunResults } from "@/components/RunResults";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LanguageModelUsage } from "ai";
import type { Tables } from "@/integrations/supabase/types";

type Run = Tables<"run">;

interface OutputSectionProps {
  output: string;
  isRunning: boolean;
  selectedModel: string;
  comparisonMode: string;
  hasReferenceMarkdown: boolean;
  markdownOfSelectedInput: string;
  selectedBookId: string | null;
  referenceMarkdown: string;
  promptResult: null | {
    promptParams: unknown;
    usage: LanguageModelUsage | null;
    outputLength: number;
    finishReason: string;
  };
  waitingForRun: boolean;
  runTimestamp?: string;
  currentRun?: Run | null;
  onRun: () => void;
  onStop?: () => void;
  onModelChange: (value: string) => void;
  onComparisonModeChange: (value: string) => void;
  onCopyOutput: () => void;
}

export const OutputSection = ({
  output,
  isRunning,
  selectedModel,
  comparisonMode,
  hasReferenceMarkdown,
  selectedBookId,
  markdownOfSelectedInput,
  referenceMarkdown,
  promptResult,
  waitingForRun,
  runTimestamp,
  currentRun,
  onRun,
  onStop,
  onModelChange,
  onComparisonModeChange,
  onCopyOutput,
}: OutputSectionProps) => {
  const [activeTab, setActiveTab] = useState("diff");

  const formatRunDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const handleRun = () => {
    setActiveTab("diff"); // Switch to Markdown tab when Run is clicked
    onRun();
  };
  return (
    <div className="flex flex-col h-full grow gap-4">
      <Card
        className="p-4 flex flex-col flex-1 grow"
        style={{ backgroundColor: "#c5dcff", maxHeight: "100%" }}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="flex items-center space-x-2">
              <Button onClick={handleRun} disabled={isRunning}>
                <Play className="h-4 w-4 mr-2" />
                {isRunning ? "Running..." : "Run"}
              </Button>
              {isRunning && onStop && (
                <Button onClick={onStop} variant="outline" size="sm">
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </Button>
              )}
            </div>
            <ModelChooser
              selectedModel={selectedModel}
              onModelChange={onModelChange}
            />
            {runTimestamp && (
              <span className="text-sm text-gray-600 ml-4">
                {formatRunDate(runTimestamp)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-grow">
            {promptResult && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="ghost">
                      {/* if finishReason is not "stop", show an error icon instead of the info icon. */}
                      {promptResult.finishReason &&
                      promptResult.finishReason !== "stop" ? (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      ) : (
                        <Info className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="left"
                    className="max-w-md max-h-64 overflow-auto"
                  >
                    <pre className="text-xs whitespace-pre-wrap">
                      {promptResult &&
                        JSON.stringify(
                          {
                            finishReason: promptResult.finishReason,
                            inputs: promptResult.promptParams,
                            usage: promptResult.usage,
                            outputLength: promptResult.outputLength,
                          },
                          null,
                          2
                        ).replace(/"/g, "")}
                    </pre>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        {waitingForRun ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-lg text-gray-500">Waiting for Run</p>
          </div>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col min-h-0 grow mt-[15px]"
          >
            <TabsList className="flex gap-2 !bg-transparent !border-none !p-0 h-auto justify-start">
              <TabsTrigger
                value="fields"
                className="px-4 py-2 !bg-transparent data-[state=active]:!bg-white data-[state=active]:!font-bold !border-none !rounded-t-md !rounded-b-none"
              >
                Fields
              </TabsTrigger>
              <TabsTrigger
                value="diff"
                className="px-4 py-2 !bg-transparent data-[state=active]:!bg-white data-[state=active]:!font-bold !border-none !rounded-t-md !rounded-b-none"
              >
                Markdown
              </TabsTrigger>
            </TabsList>
            <TabsContent
              value="fields"
              className="flex-1 min-h-0 !mt-0 grow flex flex-col data-[state=inactive]:hidden"
            >
              <RunResults runId={currentRun?.id || null} />
            </TabsContent>
            <TabsContent
              value="diff"
              className="flex-1 min-h-0 !mt-0 grow flex flex-col data-[state=inactive]:hidden"
            >
              <DiffView
                output={output}
                comparisonMode={comparisonMode}
                hasReferenceMarkdown={hasReferenceMarkdown}
                markdownOfSelectedInput={markdownOfSelectedInput}
                referenceMarkdown={referenceMarkdown}
                onComparisonModeChange={onComparisonModeChange}
                onCopyOutput={onCopyOutput}
              />
            </TabsContent>
          </Tabs>
        )}
      </Card>
    </div>
  );
};
