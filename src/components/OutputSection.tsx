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
import { Play, Copy } from "lucide-react";
import { MarkdownViewer } from "@/components/MarkdownViewer";
import { useLocalStorage } from "@/hooks/useLocalStorage";

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
  onRun: () => void;
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
  onRun,
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
          </div>
          <Select value={selectedModel} onValueChange={onModelChange}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {models.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
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
        <Button onClick={onCopyOutput} size="sm" variant="ghost">
          <Copy className="h-4 w-4 mr-2" />
        </Button>
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
