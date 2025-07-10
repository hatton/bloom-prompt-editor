import { useState, useEffect, useCallback } from "react";
import { flushSync } from "react-dom";
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
import {
  runPrompt,
  runPromptStream,
  getModels,
} from "@/integrations/openrouter/openRouterClient";
import { MarkdownViewer } from "@/components/MarkdownViewer";
import { OutputSection } from "@/components/OutputSection";
import { PromptCard } from "@/components/PromptCard";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { LanguageModelUsage } from "ai";
import { parseAndStoreFieldSet } from "@/lib/fieldParsing";

type BookInput = Tables<"book-input">;
type Prompt = Tables<"prompt">;
type Run = Tables<"run">;

interface OpenRouterModel {
  id: string;
  name: string;
}

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
  const [promptParams, setPromptParams] = useState({});
  const [finishReason, setFinishReason] = useState<string | null>(null);
  const [usage, setUsage] = useState<LanguageModelUsage | null>(null);

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
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const { toast } = useToast();
  const [waitingForRun, setWaitingForRun] = useState(false);

  const loadRun = useCallback(
    async (run: Run) => {
      try {
        setNotes(run.notes || "");
        setOutput(run.output || "");
        setSelectedBookId(run.book_input_id || null);
        setIsStarred(run.human_tags?.includes("star") || false);

        // Load run-specific settings
        if (run.model) {
          setSelectedModel(run.model);
        }

        // TODO: Handle discovered_fields when field discovery is implemented
        // if (run.discovered_fields) {
        //   // Load and display the discovered field set
        // }

        setPromptParams({}); // TODO: Should we store and load these?
        setFinishReason(null); // TODO: Should we store and load these?
        setUsage(null); // TODO: Should we store and load these?

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
    [setSelectedBookId, setCurrentPromptId, setSelectedModel]
  );

  useEffect(() => {
    const findAndLoadRun = async () => {
      if (!selectedBookId || !currentPromptId) {
        setOutput("");
        setNotes("");
        setPromptParams({});
        setFinishReason(null);
        setUsage(null);
        setIsStarred(false);
        setWaitingForRun(false);
        return;
      }

      try {
        const bookInputId = selectedBookId;

        if (!bookInputId) {
          // No book selected, clear the output
          setOutput("");
          setNotes("");
          setPromptParams({});
          setFinishReason(null);
          setUsage(null);
          setIsStarred(false);
          setWaitingForRun(false);
          return;
        }

        const { data: run, error } = await supabase
          .from("run")
          .select("*")
          .eq("prompt_id", currentPromptId)
          .eq("book_input_id", bookInputId)
          .eq("temperature", promptSettings.temperature)
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
          setPromptParams({});
          setFinishReason(null);
          setUsage(null);
          setIsStarred(false);
          setWaitingForRun(true);
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
    // Fetch models in the background
    getModels().then(setModels);
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

  // // Save prompt when component unmounts or user navigates away
  // useEffect(() => {
  //   const handleBeforeUnload = () => {
  //     if (hasPromptChanged()) {
  //       saveNewPromptIfChanged();
  //     }
  //   };

  //   window.addEventListener("beforeunload", handleBeforeUnload);

  //   return () => {
  //     window.removeEventListener("beforeunload", handleBeforeUnload);

  //     // NO: This was actually running with each keystroke
  //     // Also save when component unmounts
  //     // if (hasPromptChanged()) {
  //     //   saveNewPromptIfChanged();
  //     // }
  //   };
  // }, []);

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
    setFinishReason(null);
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

    // Create abort controller for stopping
    const controller = new AbortController();
    setAbortController(controller);
    setIsRunning(true);
    setOutput(""); // Clear previous output

    try {
      // Save new prompt if changed before running
      const promptId = await saveNewPromptIfChanged();

      const selectedInput = bookInputs.find(
        (input) => input.id === selectedBookId
      );

      if (!selectedInput) {
        toast({
          title: "Selected input not found",
          variant: "destructive",
        });
        setIsRunning(false);
        setAbortController(null);
        return;
      }

      // Get the stream with abort signal
      const { textStream, promptParams, finishReasonPromise, usagePromise } =
        await runPromptStream(
          promptSettings.promptText,
          selectedInput.ocr_markdown || "",
          selectedModel,
          openRouterApiKey,
          promptSettings.temperature,
          controller.signal
        );
      setPromptParams(promptParams);
      let fullResult = "";

      // Process stream with abort support
      const processStreamInBackground = async () => {
        try {
          const reader = textStream.getReader();
          let result = "";

          while (true) {
            // Check if abort was requested before reading
            if (controller.signal.aborted) {
              reader.releaseLock();
              throw new DOMException("Stream aborted", "AbortError");
            }

            const { done, value } = await reader.read();

            if (done) {
              reader.releaseLock();
              break;
            }

            result += value;
            fullResult = result;

            // Use flushSync to force immediate DOM update
            flushSync(() => {
              setOutput(result);
            });
          }

          return result;
        } catch (error) {
          if (
            error.name === "AbortError" ||
            error.message === "Stream aborted"
          ) {
            console.log("Stream was aborted by user");
            return fullResult; // Return partial result
          }
          console.error("Stream processing error:", error);
          throw error;
        }
      };

      // Start the streaming
      fullResult = await processStreamInBackground();

      // Set finish reason after streaming completes
      try {
        const finishReasonValue = await finishReasonPromise;
        setFinishReason(finishReasonValue);
        setUsage(await usagePromise);
      } catch (error) {
        console.error("Error getting finish reason:", error);
      }

      if (finishReason && finishReason !== "stop") {
        if (finishReason === "length") {
          throw new Error(
            `Ran out of tokens before finishing (max tokens reached)`
          );
        }
        throw new Error(`Streaming finished with reason: ${finishReason}`);
      }
      // Only save to database if not aborted
      if (!controller.signal.aborted) {
        // Parse fields from the output and create a field-set
        let discoveredFieldsId = null;
        try {
          discoveredFieldsId = await parseAndStoreFieldSet(fullResult);
          console.log("Created field set with ID:", discoveredFieldsId);
        } catch (error) {
          console.error("Error parsing and storing field set:", error);
          // Continue with run creation even if field parsing fails
        }

        // Create new run with the complete result
        const { data: newRun, error: runError } = await supabase
          .from("run")
          .insert({
            prompt_id: promptId,
            book_input_id: selectedBookId!,
            output: fullResult,
            temperature: promptSettings.temperature,
            model: selectedModel,
            notes: notes,
            discovered_fields: discoveredFieldsId,
          })
          .select()
          .single();

        if (runError) throw runError;

        // Update local state
        setRuns((prev) => [newRun, ...prev]);
        setCurrentRunIndex(0);

        toast({
          title: "Run completed successfully",
        });
      }
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

                <Button variant="ghost" size="sm" onClick={copyOutput}>
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
              models={models}
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
              promptResult={{
                promptParams,
                finishReason,
                usage,
                outputLength: output.length,
              }}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};
