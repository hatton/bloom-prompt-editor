import {
  Info,
  AlertTriangle,
  CircleDollarSign,
  DollarSign,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useRunData } from "@/hooks/useRunData";
import { formatDistanceToNow } from "date-fns";
import type { GenerationData } from "@/integrations/openrouter/openRouterClient";
import { useState } from "react";

export interface RunInfoProps {
  runId: number | null;
}

export const RunInfo = (props: RunInfoProps) => {
  const { runData, loading } = useRunData(props.runId);
  const [isOpen, setIsOpen] = useState(false);

  if (loading || !runData) {
    return null;
  }

  const hasError = runData.finish_reason && runData.finish_reason !== "stop";
  const friendlyTime = runData.created_at
    ? formatDistanceToNow(new Date(runData.created_at), { addSuffix: true })
    : "Unknown time";

  // Helper functions to format generation data
  const formatDuration = (milliseconds: number | null | undefined): string => {
    if (!milliseconds) return "N/A";
    return `${(milliseconds / 1000).toFixed(1)} seconds`;
  };

  const formatCost = (cost: number | null | undefined): string => {
    if (!cost) return "N/A";
    const cents = Math.round(cost * 100);
    return `${cents} cents`;
  };

  const formatNumber = (num: number | null | undefined): string => {
    if (!num) return "N/A";
    return num.toLocaleString();
  };

  // Extract generation data if available
  const generationData =
    runData.generation_data as unknown as GenerationData | null;

  return (
    <TooltipProvider>
      <Tooltip open={isOpen} onOpenChange={setIsOpen}>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsOpen(!isOpen)}
          >
            {hasError ? (
              <AlertTriangle className="text-red-500" />
            ) : (
              <DollarSign />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-md max-h-64 overflow-auto">
          <div className="text-xs space-y-1">
            <div>
              <strong>Tokens:</strong> {formatNumber(runData.tokens_used)}
            </div>
            <div>
              <strong>Finish Reason:</strong> {runData.finish_reason || "N/A"}
            </div>
            <div>
              <strong>When:</strong> {friendlyTime}
            </div>
            {runData.model && (
              <div>
                <strong>Model:</strong> {runData.model}
              </div>
            )}

            {generationData && (
              <>
                <div>
                  <strong>Cost:</strong> {formatCost(generationData.usage)}
                </div>{" "}
                <div>
                  <strong>Generation Time:</strong>{" "}
                  {formatDuration(generationData.generation_time)}
                </div>
                <div>
                  <strong>Latency:</strong>{" "}
                  {formatDuration(generationData.latency)}
                </div>
                <div>
                  <strong>Prompt Tokens:</strong>{" "}
                  {formatNumber(generationData.tokens_prompt)}
                </div>
                <div>
                  <strong>Completion Tokens:</strong>{" "}
                  {formatNumber(generationData.tokens_completion)}
                </div>
                <div>
                  <strong>Native Prompt Tokens:</strong>{" "}
                  {formatNumber(generationData.native_tokens_prompt)}
                </div>
                <div>
                  <strong>Native Completion Tokens:</strong>{" "}
                  {formatNumber(generationData.native_tokens_completion)}
                </div>
                <div>
                  <strong>Native Reasoning Tokens:</strong>{" "}
                  {formatNumber(generationData.native_tokens_reasoning)}
                </div>
                <div>
                  <strong>Cancelled:</strong>{" "}
                  {generationData.cancelled ? "Yes" : "No"}
                </div>
              </>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
