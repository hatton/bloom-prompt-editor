import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Play, Copy, Square, Info, AlertTriangle } from "lucide-react";
import { MarkdownViewer } from "@/components/MarkdownViewer";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface OpenRouterModel {
  id: string;
  name: string;
}

interface OutputSectionProps {
  output: string;
  isRunning: boolean;
  models: OpenRouterModel[];
  selectedModel: string;
  comparisonMode: string;
  hasReferenceMarkdown: boolean;
  currentInput: string;
  referenceMarkdown: string;
  streamResult: null | {
    promptParams: unknown;
    finishReason: string;}
  onRun: () => void;
  onStop?: () => void;
  onModelChange: (value: string) => void;
  onComparisonModeChange: (value: string) => void;
  onCopyOutput: () => void;
}

export const OutputSection = ({
  output,
  isRunning,
  models,
  selectedModel,
  comparisonMode,
  hasReferenceMarkdown,
  currentInput,
  referenceMarkdown,
  streamResult,
  onRun,
  onStop,
  onModelChange,
  onComparisonModeChange,
  onCopyOutput,
}: OutputSectionProps) => {
  // Diff view options managed by localStorage hook
  const [splitView, setSplitView] = useLocalStorage<boolean>(
    "diffSplitView",
    true
  );
  const [showAllLines, setShowAllLines] = useLocalStorage<boolean>(
    "diffShowAllLines",
    true
  );

  return (
    <Card className="p-4 flex flex-col h-full min-h-0">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center space-x-2">
            <Button onClick={onRun} disabled={isRunning}>
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
          <Select value={selectedModel} onValueChange={onModelChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {models.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name.replace(/^Google:\s*/, "")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Diff:</span>
            <Select
              value={comparisonMode}
              onValueChange={onComparisonModeChange}
            >
              <SelectTrigger className="w-[110px]">
                <SelectValue placeholder="Comparison mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="input">Input</SelectItem>
                <SelectItem value="reference" disabled={!hasReferenceMarkdown}>
                  Reference
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {comparisonMode && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Split View:</span>
                <Switch checked={splitView} onCheckedChange={setSplitView} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">All lines:</span>
                <Switch
                  checked={showAllLines}
                  onCheckedChange={setShowAllLines}
                />
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {streamResult && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="ghost">
                    {/* if finishReason is not "stop", show an error icon instead of the info icon. */}
                    {streamResult.finishReason && streamResult.finishReason !== "stop" ? (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    ) : (
                      <Info className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-md max-h-64 overflow-auto">
                  <pre className="text-xs whitespace-pre-wrap">
                    {streamResult && JSON.stringify(streamResult, null, 2)}
                  </pre>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <Button onClick={onCopyOutput} size="sm" variant="ghost">
            <Copy className="h-4 w-4 mr-2" />
          </Button>
        </div>
      </div>
      <Card className="flex-1 w-full min-h-0">
        <MarkdownViewer
          content={output}
          compareWithText={
            comparisonMode === "input" ? currentInput : referenceMarkdown
          }
          className="h-full"
          splitView={splitView}
          showDiffOnly={!showAllLines}
        />
      </Card>
    </Card>
  );
};
