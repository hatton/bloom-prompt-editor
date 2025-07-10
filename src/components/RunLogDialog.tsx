import React, { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RunLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  runLog: string[];
  isRunning: boolean;
  onClose: () => void;
}

export const RunLogDialog: React.FC<RunLogDialogProps> = ({
  open,
  onOpenChange,
  selectedCount,
  runLog,
  isRunning,
  onClose,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new log entries are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [runLog]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[90vw] h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Running Tests</DialogTitle>
          <DialogDescription>
            Executing tests for {selectedCount} selected test books
          </DialogDescription>
        </DialogHeader>

        <div
          ref={scrollRef}
          className="flex-1 overflow-auto bg-gray-50 p-4 rounded-md border min-h-0"
        >
          <pre className="text-sm font-mono whitespace-pre-wrap">
            {runLog.join("\n")}
            {isRunning && (
              <span className="inline-block animate-pulse ml-2">
                Running...
              </span>
            )}
          </pre>
        </div>

        <DialogFooter>
          <Button onClick={onClose} disabled={isRunning} variant="outline">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
