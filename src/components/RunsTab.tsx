
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Star, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BookInput {
  id: number;
  label: string;
  ocr_markdown: string;
}

interface Run {
  id: number;
  prompt_id: number;
  book_input_id: number;
  notes: string;
  output: string;
  human_tags: string[];
}

export const RunsTab = () => {
  const [selectedInputId, setSelectedInputId] = useState<string>("");
  const [promptText, setPromptText] = useState("This is the text of the prompt that the user can edit.");
  const [notes, setNotes] = useState("");
  const [output, setOutput] = useState("This is the output from the LLM. The user cannot edit it. It will be in markdown and so syntax highlighting would be good, but previewing the markdown is not desired.");
  const [currentRunIndex, setCurrentRunIndex] = useState(0);
  const [totalRuns, setTotalRuns] = useState(1);
  const [isRunning, setIsRunning] = useState(false);
  const [bookInputs] = useState<BookInput[]>([
    { id: 1, label: "Simple", ocr_markdown: "Sample markdown content" },
    { id: 2, label: "Complex Analysis", ocr_markdown: "Complex markdown content" },
    { id: 3, label: "Quick Test", ocr_markdown: "Test markdown content" }
  ]);
  const { toast } = useToast();

  // Auto-save prompt changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (promptText.trim()) {
        console.log("Auto-saving prompt:", promptText);
        toast({
          title: "Prompt auto-saved",
          duration: 1000,
        });
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [promptText, toast]);

  const handleRun = async () => {
    if (!selectedInputId) {
      toast({
        title: "Please select an input",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const selectedInput = bookInputs.find(input => input.id.toString() === selectedInputId);
    const pretendOutput = `pretend output: ${selectedInput?.ocr_markdown || "No input selected"}`;
    
    setOutput(pretendOutput);
    setTotalRuns(prev => prev + 1);
    setCurrentRunIndex(prev => prev + 1);
    setIsRunning(false);
    
    toast({
      title: "Run completed successfully",
    });
  };

  const canGoPrevious = currentRunIndex > 0;
  const canGoNext = currentRunIndex < totalRuns - 1;

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
                    {input.label}
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
              onClick={() => setCurrentRunIndex(prev => prev - 1)}
              disabled={!canGoPrevious}
              className="flex items-center space-x-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>previous run</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentRunIndex(prev => prev + 1)}
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
          onChange={(e) => setNotes(e.target.value)}
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
