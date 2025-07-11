import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Copy } from "lucide-react";
import { MarkdownViewer } from "@/components/MarkdownViewer";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useRunData } from "@/hooks/useRunData";

interface MarkdownDiffViewProps {
  runId: number | null;
}

export const MarkdownDiffView = ({ runId }: MarkdownDiffViewProps) => {
  const { runData, bookInputData, loading } = useRunData(runId);

  // Diff view options managed by localStorage hook
  const [splitView, setSplitView] = useLocalStorage<boolean>(
    "diffSplitView",
    true
  );
  const [showAllLines, setShowAllLines] = useLocalStorage<boolean>(
    "diffShowAllLines",
    true
  );
  const [comparisonMode, setComparisonMode] = useLocalStorage<string>(
    "markdown-comparison-source",
    "reference"
  );

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

  if (!runData?.output) {
    return (
      <div className="flex-1 p-4 flex items-center justify-center">
        <p className="text-gray-500">No output available</p>
      </div>
    );
  }

  const hasReferenceMarkdown = !!bookInputData?.reference_markdown;

  return (
    <div className="bg-white p-4 rounded-b-md shadow h-full flex flex-col min-h-0">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Diff:</span>
            <Select value={comparisonMode} onValueChange={setComparisonMode}>
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
          <Button onClick={handleCopyOutput} size="sm" variant="ghost">
            <Copy className="h-4 w-4 mr-2" />
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 border rounded-md overflow-hidden">
        <MarkdownViewer
          content={runData.output}
          compareWithText={
            comparisonMode === "input"
              ? bookInputData?.ocr_markdown || ""
              : bookInputData?.reference_markdown || ""
          }
          className="h-full"
          splitView={splitView}
          showDiffOnly={!showAllLines}
        />
      </div>
    </div>
  );
};
