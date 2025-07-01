
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Star, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type BookInput = Tables<"book-input">;
type Prompt = Tables<"prompt">;
type Run = Tables<"run">;

export const RunsTab = () => {
  const [selectedInputId, setSelectedInputId] = useState<string>("");
  const [promptText, setPromptText] = useState("This is the text of the prompt that the user can edit.");
  const [notes, setNotes] = useState("");
  const [output, setOutput] = useState("This is the output from the LLM. The user cannot edit it. It will be in markdown and so syntax highlighting would be good, but previewing the markdown is not desired.");
  const [currentRunIndex, setCurrentRunIndex] = useState(0);
  const [runs, setRuns] = useState<Run[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [bookInputs, setBookInputs] = useState<BookInput[]>([]);
  const [currentPromptId, setCurrentPromptId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Load data on component mount
  useEffect(() => {
    loadInitialData();
  }, []);

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
          setCurrentPromptId(prompt.id);
        }
      }
    } catch (error) {
      console.error("Error loading run:", error);
    }
  };

  // Auto-save prompt changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (promptText.trim() && currentPromptId) {
        savePrompt();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [promptText, currentPromptId]);

  const savePrompt = async () => {
    if (!currentPromptId) return;

    try {
      const { error } = await supabase
        .from("prompt")
        .update({ user_prompt: promptText })
        .eq("id", currentPromptId);

      if (error) throw error;

      toast({
        title: "Prompt auto-saved",
        duration: 1000,
      });
    } catch (error) {
      console.error("Error saving prompt:", error);
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
      // Auto-save notes after a delay
      setTimeout(() => {
        saveNotes(runs[currentRunIndex].id, value);
      }, 1000);
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
      // Create or update prompt
      let promptId = currentPromptId;
      
      if (!promptId) {
        // Create new prompt
        const { data: newPrompt, error: promptError } = await supabase
          .from("prompt")
          .insert({
            user_prompt: promptText,
            label: "Generated Prompt"
          })
          .select()
          .single();

        if (promptError) throw promptError;
        promptId = newPrompt.id;
        setCurrentPromptId(promptId);
      } else {
        // Check if prompt has changed, create new one if it has
        const { data: existingPrompt, error } = await supabase
          .from("prompt")
          .select("user_prompt")
          .eq("id", promptId)
          .single();

        if (error) throw error;

        if (existingPrompt.user_prompt !== promptText) {
          const { data: newPrompt, error: promptError } = await supabase
            .from("prompt")
            .insert({
              user_prompt: promptText,
              label: "Generated Prompt"
            })
            .select()
            .single();

          if (promptError) throw promptError;
          promptId = newPrompt.id;
          setCurrentPromptId(promptId);
        }
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const selectedInput = bookInputs.find(input => input.id.toString() === selectedInputId);
      const pretendOutput = `pretend output: ${selectedInput?.ocr_markdown || "No input selected"}`;
      
      // Create new run
      const { data: newRun, error: runError } = await supabase
        .from("run")
        .insert({
          prompt_id: promptId,
          book_input_id: parseInt(selectedInputId),
          output: pretendOutput,
          notes: notes
        })
        .select()
        .single();

      if (runError) throw runError;

      // Update local state
      setRuns(prev => [newRun, ...prev]);
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
    const newIndex = direction === "previous" 
      ? currentRunIndex - 1 
      : currentRunIndex + 1;
    
    if (newIndex >= 0 && newIndex < runs.length) {
      setCurrentRunIndex(newIndex);
      await loadRun(runs[newIndex]);
    }
  };

  const canGoPrevious = currentRunIndex > 0;
  const canGoNext = currentRunIndex < runs.length - 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center text-gray-500">
          <p className="text-lg">Loading runs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-semibold text-gray-900">Run</h2>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Input</label>
            <Select value={selectedInputId} onValueChange={setSelectedInputId}>
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
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">tags</label>
            <Star className="w-4 h-4 text-gray-400" />
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
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
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">notes</label>
        <Textarea
          value={notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          className="min-h-16 resize-none"
          placeholder="Add notes about this run..."
        />
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prompt Section */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium text-gray-900">Prompt</h3>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">Copy</Button>
              <Button variant="outline" size="sm">Paste</Button>
            </div>
          </div>
          <Textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            className="min-h-[400px] resize-none font-mono text-sm"
            placeholder="Enter your prompt here..."
          />
        </Card>

        {/* Output Section */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium text-gray-900">Output</h3>
            <Button variant="outline" size="sm">Copy</Button>
          </div>
          <div className="min-h-[400px] p-3 bg-gray-50 rounded-md border font-mono text-sm whitespace-pre-wrap">
            {output}
          </div>
        </Card>
      </div>

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
    </div>
  );
};
