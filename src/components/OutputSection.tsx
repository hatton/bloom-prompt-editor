import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ModelChooser } from "@/components/ModelChooser";
import { RunResultsView } from "@/components/RunResultsView";
import { Play, Square } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useToast } from "@/hooks/use-toast";
import { runPrompt, RunResult } from "@/lib/runPrompt";
import { supabase } from "@/integrations/supabase/client";
import { getMostRecentRunWithPromptAndModel } from "@/lib/runUtils";

type Run = Tables<"run">;
type BookInput = Tables<"book-input">;

export const OutputSection = () => {
  // Local storage state management
  const [selectedModel, setSelectedModel] = useLocalStorage<string>(
    "selectedModel",
    "google/gemini-flash-1.5"
  );
  const [selectedBookId, setSelectedBookId] = useLocalStorage<number | null>(
    "selectedBookId",
    null
  );
  const [currentPromptId] = useLocalStorage<number | null>(
    "currentPromptId",
    null
  );
  const [openRouterApiKey] = useLocalStorage<string>("openRouterApiKey", "");

  // Local component state
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState("");
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const [waitingForRun, setWaitingForRun] = useState(false);
  const [currentRun, setCurrentRun] = useState<Run | null>(null);
  const [bookInputs, setBookInputs] = useState<BookInput[]>([]);
  const [promptSettings, setPromptSettings] = useState({
    promptText: "",
    temperature: 0,
  });

  const { toast } = useToast();

  // Debug effect to track currentRun changes
  useEffect(() => {
    console.log("🔄 OutputSection: currentRun state changed", {
      runId: currentRun?.id,
      finishReason: currentRun?.finish_reason,
      output:
        currentRun?.output?.substring(0, 100) +
        (currentRun?.output && currentRun.output.length > 100 ? "..." : ""),
      hasCurrentRun: !!currentRun,
    });
  }, [currentRun]);

  // Create a wrapper for setOutput with logging
  const setOutputWithLogging = useCallback(
    (newOutput: string) => {
      console.log("📝 OutputSection: setOutput called", {
        newLength: newOutput.length,
        previousLength: output.length,
        preview:
          newOutput.substring(0, 100) + (newOutput.length > 100 ? "..." : ""),
      });
      setOutput(newOutput);
    },
    [output.length]
  );

  // Load book inputs and current prompt settings
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load book inputs
        const { data: inputs, error: inputsError } = await supabase
          .from("book-input")
          .select("*")
          .order("created_at", { ascending: false });

        if (inputsError) throw inputsError;
        setBookInputs(inputs || []);

        // Load current prompt settings if we have a prompt ID
        if (currentPromptId) {
          const { data: prompt, error } = await supabase
            .from("prompt")
            .select("*")
            .eq("id", currentPromptId)
            .single();

          if (prompt && !error) {
            setPromptSettings({
              promptText: prompt.user_prompt || "",
              temperature: prompt.temperature ?? 0,
            });
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };

    loadData();
  }, [currentPromptId]);

  useEffect(() => {
    const fetchCurrentRun = async () => {
      const info = await getMostRecentRunWithPromptAndModel(
        selectedBookId,
        currentPromptId,
        selectedModel
      );

      setCurrentRun(info);
    };

    fetchCurrentRun();
  }, [selectedBookId, currentPromptId, selectedModel]);

  const handleRun = async () => {
    console.log("🎯 OutputSection: handleRun triggered", {
      selectedBookId,
      currentPromptId,
      selectedModel,
      hasApiKey: !!openRouterApiKey,
      isRunning,
      promptSettings,
    });

    setWaitingForRun(false);
    if (!selectedBookId) {
      toast({
        title: "Please select an input",
        variant: "destructive",
      });
      return;
    }

    if (!currentPromptId) {
      toast({
        title: "No prompt selected",
        variant: "destructive",
      });
      return;
    }

    if (!openRouterApiKey) {
      toast({
        title: "API Key not set",
        description: "Please set your OpenRouter API key in the Settings tab.",
        variant: "destructive",
      });
      return;
    }

    const selectedInput = bookInputs.find(
      (input) => input.id === selectedBookId
    );

    if (!selectedInput) {
      toast({
        title: "Selected input not found",
        variant: "destructive",
      });
      return;
    }

    const controller = new AbortController();
    setAbortController(controller);
    setIsRunning(true);
    setOutput("");

    console.log("🎬 OutputSection: Starting prompt run", {
      currentPromptId,
      selectedBookId,
      selectedModel,
      promptSettings,
      inputMarkdownLength: selectedInput.ocr_markdown?.length || 0,
      hasApiKey: !!openRouterApiKey,
    });

    let runResult: RunResult | null = null;
    try {
      console.log("📞 OutputSection: Calling runPrompt...");
      runResult = await runPrompt(
        currentPromptId,
        selectedBookId,
        openRouterApiKey,
        promptSettings,
        selectedModel,
        selectedInput.ocr_markdown || "",
        controller.signal,
        setOutputWithLogging
      );
      console.log("✅ OutputSection: Run prompt finished successfully", {
        runId: runResult?.run?.id,
        outputLength: runResult?.run?.output?.length || 0,
      });
      toast({
        title: "Run completed successfully",
      });
    } catch (error) {
      console.error("❌ OutputSection: Run prompt error:", error);

      // Check if the error contains a run result (for payment errors)
      const errorWithRunResult = error as Error & { runResult?: RunResult };
      if (errorWithRunResult.runResult) {
        console.log("📋 OutputSection: Error contains run result, using it");
        runResult = errorWithRunResult.runResult;
      }

      if (error.name !== "AbortError" && error.message !== "Stream aborted") {
        console.error("Error running prompt:", error);
        toast({
          title: "Error running prompt: " + error.message,
          variant: "destructive",
        });
      } else {
        console.log("⏹️ OutputSection: Run was aborted");
        toast({
          title: "Run stopped",
          duration: 1000,
        });
      }
    } finally {
      console.log("🔚 OutputSection: Cleaning up run state", {
        hasRunResult: !!runResult,
        runId: runResult?.run?.id,
        runResultType: typeof runResult,
        runObject: runResult?.run,
      });

      if (runResult?.run) {
        console.log("✅ OutputSection: Setting currentRun with run data", {
          runId: runResult.run.id,
          finishReason: runResult.run.finish_reason,
        });
        setCurrentRun(runResult.run);
      } else {
        console.log("⚠️ OutputSection: No run result to set");
      }

      setIsRunning(false);
      setAbortController(null);
    }
  };

  const handleStop = () => {
    if (abortController) {
      abortController.abort();
      setIsRunning(false);
      setAbortController(null);
    }
  };

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
              {isRunning && (
                <Button onClick={handleStop} variant="outline" size="sm">
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </Button>
              )}
            </div>
            <ModelChooser
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
            />
          </div>
        </div>
        <br />

        {waitingForRun ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-lg text-gray-500">Waiting for Run</p>
          </div>
        ) : (
          <RunResultsView
            runId={currentRun?.id || null}
            defaultOutput="markdown"
          />
        )}
      </Card>
    </div>
  );
};
