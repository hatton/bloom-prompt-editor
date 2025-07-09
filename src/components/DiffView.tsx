import { useState } from "react";
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
import { Copy } from "lucide-react";
import { MarkdownViewer } from "@/components/MarkdownViewer";
import { useLocalStorage } from "@/hooks/useLocalStorage";

interface DiffViewProps {
  output: string;
  comparisonMode: string;
  hasReferenceMarkdown: boolean;
  currentInput: string;
  referenceMarkdown: string;
  onComparisonModeChange: (value: string) => void;
  onCopyOutput: () => void;
}

export const DiffView = ({
  output,
  comparisonMode,
  hasReferenceMarkdown,
  currentInput,
  referenceMarkdown,
  onComparisonModeChange,
  onCopyOutput,
}: DiffViewProps) => {
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
<div className="bg-white p-4 rounded-b-md shadow h-full flex flex-col min-h-0">
    <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Diff:</span>
                <Select value={comparisonMode} onValueChange={onComparisonModeChange}>
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
            <Button onClick={onCopyOutput} size="sm" variant="ghost">
                <Copy className="h-4 w-4 mr-2" />
            </Button>
        </div>
    </div>

    <div className="flex-1 min-h-0 border rounded-md overflow-hidden">
        <MarkdownViewer
            content={output}
            compareWithText={
                comparisonMode === "input" ? currentInput : referenceMarkdown
            }
            className="h-full"
            splitView={splitView}
            showDiffOnly={!showAllLines}
        />
    </div>
</div>
  );
};
