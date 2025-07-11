import { Info, AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useRunData } from "@/hooks/useRunData";
import { formatDistanceToNow } from "date-fns";

export interface RunInfoProps {
  runId: number | null;
}

export const RunInfo = (props: RunInfoProps) => {
  const { runData, loading } = useRunData(props.runId);

  if (loading || !runData) {
    return null;
  }

  const hasError = runData.finish_reason && runData.finish_reason !== "stop";
  const friendlyTime = runData.created_at
    ? formatDistanceToNow(new Date(runData.created_at), { addSuffix: true })
    : "Unknown time";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="sm" variant="ghost">
            {hasError ? (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            ) : (
              <Info className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-md max-h-64 overflow-auto">
          <div className="text-xs space-y-1">
            <div>
              <strong>Tokens:</strong> {runData.tokens_used || "N/A"}
            </div>
            <div>
              <strong>Finish Reason:</strong> {runData.finish_reason || "N/A"}
            </div>
            <div>
              <strong>Time:</strong> {friendlyTime}
            </div>
            {runData.model && (
              <div>
                <strong>Model:</strong> {runData.model}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
