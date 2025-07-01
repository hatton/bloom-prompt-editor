import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft,
  ArrowRight,
  Star,
  Play,
  Copy,
  Clipboard,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { github } from "react-syntax-highlighter/dist/esm/styles/hljs";
import markdown from "react-syntax-highlighter/dist/esm/languages/hljs/markdown";

// Register markdown language
SyntaxHighlighter.registerLanguage("markdown", markdown);

type BookInput = Tables<"book-input">;
type Prompt = Tables<"prompt">;
type Run = Tables<"run">;

export const RunsTab = () => {
  const [selectedInputId, setSelectedInputId] = useState<string>("");
  const [promptText, setPromptText] = useState(
    "This is the text of the prompt that the user can edit."
  );
  const [notes, setNotes] = useState("");
  const [output, setOutput] = useState("");
  const [currentRunIndex, setCurrentRunIndex] = useState(0);
  const [runs, setRuns] = useState<Run[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [bookInputs, setBookInputs] = useState<BookInput[]>([]);
  const [currentPromptId, setCurrentPromptId] = useState<number | null>(null);
  const [originalPromptText, setOriginalPromptText] = useState("");
  const [isStarred, setIsStarred] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load data on component mount
  useEffect(() => {
    loadInitialData();
  }, []);

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

  const loadInitialData = async () => {
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

      // If we have runs, load the most recent one
      if (runsData && runsData.length > 0) {
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
  };

  const loadRun = async (run: Run) => {
    try {
      setNotes(run.notes || "");
      setOutput(run.output || "");
      setSelectedInputId(run.book_input_id?.toString() || "");
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
          setPromptText(prompt.user_prompt || "");
          setOriginalPromptText(prompt.user_prompt || "");
          setCurrentPromptId(prompt.id);
        }
      }
    } catch (error) {
      console.error("Error loading run:", error);
    }
  };

  const hasPromptChanged = () => {
    return promptText !== originalPromptText;
  };

  const saveNewPromptIfChanged = async () => {
    if (!hasPromptChanged()) return currentPromptId;

    try {
      const { data: newPrompt, error } = await supabase
        .from("prompt")
        .insert({
          user_prompt: promptText,
          label: "Generated Prompt",
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentPromptId(newPrompt.id);
      setOriginalPromptText(promptText);

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
    if (!selectedInputId) {
      toast({
        title: "Please select an input",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);

    try {
      // Save new prompt if changed before running
      const promptId = await saveNewPromptIfChanged();

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const selectedInput = bookInputs.find(
        (input) => input.id.toString() === selectedInputId
      );
      const pretendOutput = `pretend output: ${
        selectedInput?.ocr_markdown || "No input selected"
      }`;

      // Create new run
      const { data: newRun, error: runError } = await supabase
        .from("run")
        .insert({
          prompt_id: promptId,
          book_input_id: parseInt(selectedInputId),
          output: pretendOutput,
          notes: notes,
        })
        .select()
        .single();

      if (runError) throw runError;

      // Update local state
      setRuns((prev) => [newRun, ...prev]);
      setCurrentRunIndex(0);
      setOutput(pretendOutput);

      toast({
        title: "Run completed successfully",
      });
    } catch (error) {
      console.error("Error running prompt:", error);
      toast({
        title: "Error running prompt",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const navigateRun = async (direction: "previous" | "next") => {
    // Save prompt if changed before navigating
    if (hasPromptChanged()) {
      await saveNewPromptIfChanged();
    }

    const newIndex =
      direction === "previous" ? currentRunIndex - 1 : currentRunIndex + 1;

    if (newIndex >= 0 && newIndex < runs.length) {
      setCurrentRunIndex(newIndex);
      await loadRun(runs[newIndex]);
    }
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(promptText);
      toast({
        title: "Prompt copied to clipboard",
        duration: 1000,
      });
    } catch (err) {
      toast({
        title: "Failed to copy prompt",
        variant: "destructive",
      });
    }
  };

  const pastePrompt = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setPromptText(text);
      toast({
        title: "Prompt pasted from clipboard",
        duration: 1000,
      });
    } catch (err) {
      toast({
        title: "Failed to paste content",
        variant: "destructive",
      });
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center text-gray-500">
          <p className="text-lg">Loading runs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="p-6 pb-0 flex-shrink-0">
        {/* Header Controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-semibold text-gray-900">Run</h2>

            {/* <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleStar}
                className={`p-1 ${
                  isStarred ? "text-yellow-500" : "text-gray-400"
                }`}
              >
                <Star className={`w-4 h-4 ${isStarred ? "fill-current" : ""}`} />
              </Button>
            </div> */}
          </div>

          {/* <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateRun("previous")}
                disabled={!canGoPrevious}
                className="flex items-center space-x-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>previous run</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigateRun("next")}
                disabled={!canGoNext}
                className="flex items-center space-x-1"
              >
                <span>next run</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div> */}
        </div>

        {/* Notes */}
        {/* <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">notes</label>
          <Textarea
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            className="min-h-16 resize-none"
            placeholder="Add notes about this run..."
          />
        </div> */}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 pt-0 min-h-0">
        <div className="grid grid-cols-3 gap-4 h-full">
          {/* Prompt Section */}
          <Card className="p-4 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <h3 className="text-lg font-medium text-gray-900">Prompt</h3>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={copyPrompt}>
                  <Copy className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={pastePrompt}>
                  <Clipboard className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <Textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              className="flex-1 resize-none font-mono text-sm min-h-0"
              placeholder="Enter your prompt here..."
              onBlur={saveNewPromptIfChanged}
            />
          </Card>

          {/* Show Input Section, using SyntaxHighlighter for markdown */}
          <Card className="p-4 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <h3 className="text-lg font-medium text-gray-900">Input</h3>

              <Select
                value={selectedInputId}
                onValueChange={setSelectedInputId}
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

              <Button variant="outline" size="sm" onClick={copyOutput}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 rounded-md border overflow-auto">
              <SyntaxHighlighter
                language="markdown"
                style={github}
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
              >
                {bookInputs.find(
                  (input) => input.id.toString() === selectedInputId
                )?.ocr_markdown || ""}
              </SyntaxHighlighter>
            </div>
          </Card>

          {/* Output Section */}
          <Card className="p-4 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <h3 className="text-lg font-medium text-gray-900">Output</h3>
              {/* Run Button */}
              <div className="flex justify-center">
                <Button
                  onClick={handleRun}
                  disabled={isRunning || !selectedInputId}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-2 rounded-md font-medium"
                >
                  {isRunning ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Running...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Play className="w-4 h-4" />
                      <span>Run</span>
                    </div>
                  )}
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={copyOutput}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 rounded-md border overflow-auto">
              <SyntaxHighlighter
                language="markdown"
                style={github}
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
              >
                {output}
              </SyntaxHighlighter>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
