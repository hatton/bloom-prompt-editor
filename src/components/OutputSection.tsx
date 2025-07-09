import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Square, Info, AlertTriangle } from "lucide-react";
import { DiffView } from "@/components/DiffView";
import { FieldView } from "@/components/FieldView";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LanguageModelUsage } from "ai";

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
  markdownOfSelectedInput: string;
  selectedInputId: string;
  referenceMarkdown: string;
  promptResult: null | {
    promptParams: unknown;
    usage: LanguageModelUsage | null;
    outputLength: number;
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
  selectedInputId,
  markdownOfSelectedInput,
  referenceMarkdown,
  promptResult,
  onRun,
  onStop,
  onModelChange,
  onComparisonModeChange,
  onCopyOutput,
}: OutputSectionProps) => {
  return (
    <div className="flex flex-col h-full grow gap-4">
      <Card className="p-4 flex flex-col flex-1 grow" style={{ backgroundColor: "#c5dcff", maxHeight: "100%" }}>
        <div className="flex justify-between items-center">
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
          </div>
            <div className="flex items-center gap-2 flex-grow">
            {promptResult && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="ghost">
                      {/* if finishReason is not "stop", show an error icon instead of the info icon. */}
                      {promptResult.finishReason && promptResult.finishReason !== "stop" ? (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      ) : (
                        <Info className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-md max-h-64 overflow-auto">
                    <pre className="text-xs whitespace-pre-wrap">
                      {promptResult && JSON.stringify({finishReason:promptResult.finishReason,inputs:promptResult.promptParams,usage:promptResult.usage, outputLength: promptResult.outputLength}, null, 2).replace(/"/g, "")}
                    </pre>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      
      <Tabs defaultValue="diff" className="flex-1 flex flex-col min-h-0 grow mt-[15px]">
        <TabsList className="flex gap-2 !bg-transparent !border-none !p-0 h-auto justify-start">
          <TabsTrigger value="fields" className="px-4 py-2 !bg-transparent data-[state=active]:!bg-white data-[state=active]:!font-bold !border-none !rounded-t-md !rounded-b-none">Fields</TabsTrigger>
          <TabsTrigger value="diff" className="px-4 py-2 !bg-transparent data-[state=active]:!bg-white data-[state=active]:!font-bold !border-none !rounded-t-md !rounded-b-none">Markdown</TabsTrigger>
          
        </TabsList>
        <TabsContent value="fields" className="flex-1 min-h-0 !mt-0 grow flex flex-col data-[state=inactive]:hidden">
          <FieldView 
            output={output}
            currentInputId={selectedInputId}
          />
        </TabsContent>
        <TabsContent value="diff" className="flex-1 min-h-0 !mt-0 grow flex flex-col data-[state=inactive]:hidden">
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

      </Tabs></Card>
    </div>
  );
};
