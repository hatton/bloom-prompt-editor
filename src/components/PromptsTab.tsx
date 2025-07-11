import { runPrompt, RunResult } from "@/lib/runPrompt";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Star, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { MarkdownViewer } from "@/components/MarkdownViewer";
import { OutputSection } from "@/components/OutputSection";
import { PromptCard } from "@/components/PromptCard";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { LanguageModelUsage } from "ai";

type BookInput = Tables<"book-input">;
type Prompt = Tables<"prompt">;
type Run = Tables<"run">;

export const PromptsTab = () => {
  // Settings managed by localStorage hook
  const [currentPromptId, setCurrentPromptId] = useLocalStorage<number | null>(
    "currentPromptId",
    null
  );
  const [selectedBookId, setSelectedBookId] = useLocalStorage<number | null>(
    "selectedBookId",
    null
  );
  const [selectedModel, setSelectedModel] = useLocalStorage<string>(
    "selectedModel",
    "google/gemini-flash-1.5"
  );
  const [comparisonMode, setComparisonMode] = useLocalStorage<string>(
    "comparisonMode",
    "input"
  );
  const [openRouterApiKey] = useLocalStorage<string>("openRouterApiKey", "");

  // Other state
  const [promptSettings, setPromptSettings] = useState({
    promptText: "This is the text of the prompt that the user can edit.",
    temperature: 0,
  });
  const [promptLabel, setPromptLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [output, setOutput] = useState("");
  const [currentRunIndex, setCurrentRunIndex] = useState(0);
  const [runs, setRuns] = useState<Run[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [bookInputs, setBookInputs] = useState<BookInput[]>([]);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const [originalPromptSettings, setOriginalPromptSettings] = useState({
    promptText: "",
    temperature: 0,
  });
  const [originalPromptLabel, setOriginalPromptLabel] = useState("");
  const [isStarred, setIsStarred] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [waitingForRun, setWaitingForRun] = useState(false);
  const [currentPromptResult, setCurrentPromptResult] =
    useState<RunResult | null>(null);

  const loadRun = useCallback(
    async (run: Run) => {
      try {
        setNotes(run.notes || "");
        setOutput(run.output || "");
        setSelectedBookId(run.book_input_id || null);
        setIsStarred(run.human_tags?.includes("star") || false);

        // Clear the current prompt result since we're loading a different run
        setCurrentPromptResult(null);

        // Note: We don't set the selectedModel here to avoid circular dependencies
        // The selectedModel should drive the run selection, not the other way around

        // TODO: Handle discovered_fields when field discovery is implemented
        // if (run.discovered_fields) {
        //   // Load and display the discovered field set
        // }

        // Load the prompt for this run
        if (run.prompt_id) {
          const { data: prompt, error } = await supabase
            .from("prompt")
            .select("*")
            .eq("id", run.prompt_id)
            .single();

          if (error) throw error;
          if (prompt) {
            const newPromptSettings = {
              promptText: prompt.user_prompt || "",
              temperature: prompt.temperature ?? 0,
            };
            setPromptSettings(newPromptSettings);
            setOriginalPromptSettings(newPromptSettings);
            setPromptLabel(prompt.label || "");
            setOriginalPromptLabel(prompt.label || "");
            setCurrentPromptId(prompt.id);
          }
        }
      } catch (error) {
        console.error("Error loading run:", error);
      }
    },
    [setSelectedBookId, setCurrentPromptId]
  );

  useEffect(() => {
    const findAndLoadRun = async () => {
      if (!selectedBookId || !currentPromptId) {
        setOutput("");
        setNotes("");
        setIsStarred(false);
        setWaitingForRun(false);
        setCurrentPromptResult(null);
        return;
      }

      try {
        const bookInputId = selectedBookId;

        if (!bookInputId) {
          // No book selected, clear the output
          setOutput("");
          setNotes("");
          setIsStarred(false);
          setWaitingForRun(false);
          setCurrentPromptResult(null);
          return;
        }

        const { data: run, error } = await supabase
          .from("run")
          .select("*")
          .eq("prompt_id", currentPromptId)
          .eq("book_input_id", bookInputId)
          .eq("temperature", promptSettings.temperature)
          .eq("model", selectedModel)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== "PGRST116") {
          // PGRST116 means no rows found, which is not an error in this case.
          throw error;
        }

        if (run) {
          await loadRun(run);
          const runIndex = runs.findIndex((r) => r.id === run.id);
          if (runIndex !== -1) {
            setCurrentRunIndex(runIndex);
          }
          setWaitingForRun(false);
        } else {
          // No run found, clear the output
          setOutput("");
          setNotes("");
          setIsStarred(false);
          setWaitingForRun(true);
          setCurrentPromptResult(null);
        }
      } catch (error) {
        console.error("Error finding matching run:", error);
        toast({
          title: "Error searching for a matching run",
          variant: "destructive",
        });
      }
    };

    findAndLoadRun();
  }, [
    selectedBookId,
    currentPromptId,
    promptSettings.temperature,
    selectedModel,
    runs,
    loadRun,
    toast,
  ]);

  const loadInitialData = useCallback(async () => {
    try {
      // Load book inputs
      const { data: inputs, error: inputsError } = await supabase
        .from("book-input")
        .select("*")
        .order("created_at", { ascending: false });

      if (inputsError) throw inputsError;
      setBookInputs(inputs || []);

      // Load runs
      const { data: runsData, error: runsError } = await supabase
        .from("run")
        .select("*")
        .order("created_at", { ascending: false });

      if (runsError) throw runsError;
      setRuns(runsData || []);

      let promptLoaded = false;
      if (currentPromptId) {
        const { data: prompt, error } = await supabase
          .from("prompt")
          .select("*")
          .eq("id", currentPromptId)
          .single();

        if (prompt && !error) {
          const newPromptSettings = {
            promptText: prompt.user_prompt || "",
            temperature: prompt.temperature ?? 0,
          };
          setPromptSettings(newPromptSettings);
          setOriginalPromptSettings(newPromptSettings);
          setPromptLabel(prompt.label || "");
          setOriginalPromptLabel(prompt.label || "");
          promptLoaded = true;
        } else {
          setCurrentPromptId(null);
        }
      }

      // If we have runs, load the most recent one
      if (!promptLoaded && runsData && runsData.length > 0) {
        await loadRun(runsData[0]);
        setCurrentRunIndex(0);
      }
    } catch (error) {
      console.error("Error loading initial data:", error);
      toast({
        title: "Error loading data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [loadRun, toast, currentPromptId, setCurrentPromptId]);

  // Load data on component mount
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Auto-switch to "input" if "reference" is selected but no reference markdown exists
  useEffect(() => {
    const selectedInput = bookInputs.find(
      (input) => input.id === selectedBookId
    );
    const hasRefMarkdown = !!selectedInput?.reference_markdown;

    if (comparisonMode === "reference" && !hasRefMarkdown) {
      setComparisonMode("input");
    }
  }, [selectedBookId, bookInputs, comparisonMode, setComparisonMode]);

  const hasPromptChanged = () => {
    return (
      promptSettings.promptText !== originalPromptSettings.promptText ||
      promptSettings.temperature !== originalPromptSettings.temperature ||
      promptLabel !== originalPromptLabel
    );
  };

  const saveNewPromptIfChanged = async () => {
    if (!hasPromptChanged()) return currentPromptId;

    try {
      const { data: newPrompt, error } = await supabase
        .from("prompt")
        .insert({
          user_prompt: promptSettings.promptText,
          temperature: promptSettings.temperature,
          label: promptLabel,
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentPromptId(newPrompt.id);
      setOriginalPromptSettings(promptSettings);
      setOriginalPromptLabel(promptLabel);

      // Update the current run to point to the new prompt
      if (runs[currentRunIndex]) {
        await supabase
          .from("run")
          .update({ prompt_id: newPrompt.id })
          .eq("id", runs[currentRunIndex].id);

        setRuns((prev) =>
          prev.map((run, index) =>
            index === currentRunIndex
              ? { ...run, prompt_id: newPrompt.id }
              : run
          )
        );
      }

      return newPrompt.id;
    } catch (error) {
      console.error("Error saving new prompt:", error);
      throw error;
    }
  };

  const saveNotes = async (runId: number, notesText: string) => {
    try {
      const { error } = await supabase
        .from("run")
        .update({ notes: notesText })
        .eq("id", runId);

      if (error) throw error;
    } catch (error) {
      console.error("Error saving notes:", error);
    }
  };

  const handleNotesChange = (value: string) => {
    setNotes(value);
    if (runs[currentRunIndex]) {
      setTimeout(() => {
        saveNotes(runs[currentRunIndex].id, value);
      }, 1000);
    }
  };

  const toggleStar = async () => {
    if (!runs[currentRunIndex]) return;

    const currentRun = runs[currentRunIndex];
    const currentTags = currentRun.human_tags || [];
    const newIsStarred = !isStarred;

    let newTags;
    if (newIsStarred) {
      newTags = [...currentTags.filter((tag) => tag !== "star"), "star"];
    } else {
      newTags = currentTags.filter((tag) => tag !== "star");
    }

    try {
      const { error } = await supabase
        .from("run")
        .update({ human_tags: newTags })
        .eq("id", currentRun.id);

      if (error) throw error;

      setIsStarred(newIsStarred);
      setRuns((prev) =>
        prev.map((run, index) =>
          index === currentRunIndex ? { ...run, human_tags: newTags } : run
        )
      );

      toast({
        title: newIsStarred ? "Run starred" : "Run unstarred",
        duration: 1000,
      });
    } catch (error) {
      console.error("Error toggling star:", error);
      toast({
        title: "Error updating star",
        variant: "destructive",
      });
    }
  };

  const handleRun = async () => {
    setWaitingForRun(false);
    if (!selectedBookId) {
      toast({
        title: "Please select an input",
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

    try {
      const promptId = await saveNewPromptIfChanged();

      const runResult = await runPrompt(
        promptId,
        selectedBookId,
        openRouterApiKey,
        promptSettings,
        selectedModel,
        selectedInput.ocr_markdown || "",
        controller.signal,
        setOutput
      );

      // Store the complete run result for use in promptResult prop
      setCurrentPromptResult(runResult);

      // Update local state with the new run
      setRuns((prev) => [runResult.run, ...prev]);
      setCurrentRunIndex(0);

      toast({
        title: "Run completed successfully",
      });
    } catch (error) {
      if (error.name !== "AbortError" && error.message !== "Stream aborted") {
        console.error("Error running prompt:", error);
        toast({
          title: "Error running prompt: " + error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Run stopped",
          duration: 1000,
        });
      }
    } finally {
      setIsRunning(false);
      setAbortController(null);
    }
  };

  const handleStop = () => {
    if (abortController) {
      abortController.abort();
      // Immediately reset UI state when stopping
      setIsRunning(false);
      setAbortController(null);
      // Note: The toast will be shown in the catch block of handleRun
    }
  };

  const copyOutput = async () => {
    try {
      await navigator.clipboard.writeText(output);
      toast({
        title: "Output copied to clipboard",
        duration: 1000,
      });
    } catch (err) {
      toast({
        title: "Failed to copy output",
        variant: "destructive",
      });
    }
  };

  const copyInput = async () => {
    try {
      await navigator.clipboard.writeText(markdownOfSelectedInput);
      toast({
        title: "Input copied to clipboard",
        duration: 1000,
      });
    } catch (err) {
      toast({
        title: "Failed to copy input",
        variant: "destructive",
      });
    }
  };

  const canGoPrevious = currentRunIndex > 0;
  const canGoNext = currentRunIndex < runs.length - 1;

  // Check if the selected input has reference markdown
  const selectedInput = bookInputs.find((input) => input.id === selectedBookId);

  // Auto-switch to "input" if "reference" is selected but no reference markdown exists
  useEffect(() => {
    const hasReferenceMarkdown = !!selectedInput?.reference_markdown;
    if (comparisonMode === "reference" && !hasReferenceMarkdown) {
      setComparisonMode("input");
    }
  }, [
    selectedBookId,
    selectedInput?.reference_markdown,
    comparisonMode,
    setComparisonMode,
  ]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center text-gray-500">
          <p className="text-lg">Loading runs...</p>
        </div>
      </div>
    );
  }

  const markdownOfSelectedInput =
    bookInputs.find((input) => input.id === selectedBookId)?.ocr_markdown || "";

  const referenceMarkdown =
    bookInputs.find((input) => input.id === selectedBookId)
      ?.reference_markdown || "";

  const hasReferenceMarkdown = !!referenceMarkdown;

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Main Content Area */}
      <div className="flex-1 pt-0 min-h-0">
        <ResizablePanelGroup
          direction="horizontal"
          className="h-full"
          autoSaveId="runs-tab-layout"
        >
          <ResizablePanel defaultSize={33}>
            {/* Prompt Section */}
            <PromptCard
              promptSettings={promptSettings}
              onPromptSettingsChange={setPromptSettings}
              onBlur={saveNewPromptIfChanged}
              currentPromptId={currentPromptId}
              label={promptLabel}
              onLabelChange={setPromptLabel}
            />
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={23}>
            {/* Show Input Section, using SyntaxHighlighter for markdown */}
            <Card className="p-4 flex flex-col h-full min-h-0">
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <h3 className="text-lg font-bold text-gray-900">Input</h3>

                <Select
                  value={selectedBookId?.toString() || ""}
                  onValueChange={(value) =>
                    setSelectedBookId(value ? parseInt(value, 10) : null)
                  }
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select input..." />
                  </SelectTrigger>
                  <SelectContent>
                    {bookInputs.map((input) => (
                      <SelectItem key={input.id} value={input.id.toString()}>
                        {input.label || "Untitled"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button variant="ghost" size="sm" onClick={copyInput}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex-1 rounded-md border overflow-auto">
                <MarkdownViewer
                  content={markdownOfSelectedInput}
                  customStyle={{
                    margin: 0,
                    padding: "12px",
                    backgroundColor: "#f8f9fa",
                    fontSize: "14px",
                    fontFamily:
                      'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                    height: "100%",
                    border: "none",
                  }}
                  wrapLines={true}
                  wrapLongLines={true}
                />
              </div>
            </Card>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={44}>
            <OutputSection
              output={output}
              isRunning={isRunning}
              selectedModel={selectedModel}
              comparisonMode={comparisonMode}
              hasReferenceMarkdown={hasReferenceMarkdown}
              selectedBookId={selectedBookId?.toString() || null}
              markdownOfSelectedInput={markdownOfSelectedInput}
              referenceMarkdown={referenceMarkdown}
              onRun={handleRun}
              onStop={handleStop}
              onModelChange={setSelectedModel}
              onComparisonModeChange={setComparisonMode}
              onCopyOutput={copyOutput}
              waitingForRun={waitingForRun}
              runTimestamp={runs[currentRunIndex]?.created_at}
              currentRun={runs[currentRunIndex] || null}
              promptResult={
                currentPromptResult
                  ? {
                      promptParams: currentPromptResult.promptParams,
                      usage: currentPromptResult.usage,
                      outputLength: output.length,
                      finishReason:
                        currentPromptResult.finishReason || "unknown",
                    }
                  : null
              }
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};
