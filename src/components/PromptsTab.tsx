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
  const [openRouterApiKey] = useLocalStorage<string>("openRouterApiKey", "");

  // Other state
  const [promptSettings, setPromptSettings] = useState({
    promptText: "This is the text of the prompt that the user can edit.",
    temperature: 0,
  });
  const [promptLabel, setPromptLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [currentRunIndex, setCurrentRunIndex] = useState(0);
  const [runs, setRuns] = useState<Run[]>([]);
  const [bookInputs, setBookInputs] = useState<BookInput[]>([]);
  const [originalPromptSettings, setOriginalPromptSettings] = useState({
    promptText: "",
    temperature: 0,
  });
  const [originalPromptLabel, setOriginalPromptLabel] = useState("");
  const [isStarred, setIsStarred] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadRun = useCallback(
    async (run: Run) => {
      try {
        setNotes(run.notes || "");
        setSelectedBookId(run.book_input_id || null);
        setIsStarred(run.human_tags?.includes("star") || false);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center text-gray-500">
          <p className="text-lg">Loading runs...</p>
        </div>
      </div>
    );
  }

  const copyInput = async () => {
    const markdownOfSelectedInput =
      bookInputs.find((input) => input.id === selectedBookId)?.ocr_markdown ||
      "";
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

  const markdownOfSelectedInput =
    bookInputs.find((input) => input.id === selectedBookId)?.ocr_markdown || "";

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
              onPromptLoad={setCurrentPromptId}
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
            <OutputSection />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};
