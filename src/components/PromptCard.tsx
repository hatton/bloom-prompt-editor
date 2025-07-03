import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Copy, Clipboard, ChevronDown, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface PromptSettings {
  promptText: string;
  temperature: number;
}

interface SavedPrompt {
  label: string;
  promptText: string;
  temperature: number;
  timestamp: number;
}

interface PromptCardProps {
  promptSettings: PromptSettings;
  onPromptSettingsChange: (settings: PromptSettings) => void;
  onBlur?: () => void;
}

export const PromptCard = ({
  promptSettings,
  onPromptSettingsChange,
  onBlur,
}: PromptCardProps) => {
  const { toast } = useToast();
  const [label, setLabel] = useState("");
  const [previousLabel, setPreviousLabel] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Load saved prompts from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("savedPrompts");
    if (stored) {
      try {
        setSavedPrompts(JSON.parse(stored));
      } catch (error) {
        console.error("Failed to parse saved prompts:", error);
      }
    }
  }, []);

  const savePrompt = (labelText: string) => {
    if (labelText.trim()) {
      const newPrompt: SavedPrompt = {
        label: labelText,
        promptText: promptSettings.promptText,
        temperature: promptSettings.temperature,
        timestamp: Date.now(),
      };

      // Update saved prompts - replace if label exists, otherwise add
      const updatedPrompts = savedPrompts.filter((p) => p.label !== labelText);
      updatedPrompts.push(newPrompt);

      setSavedPrompts(updatedPrompts);
      localStorage.setItem("savedPrompts", JSON.stringify(updatedPrompts));

      toast({
        title: `Saved Prompt as ${labelText}`,
        duration: 2000,
      });
    }
  };

  const loadPrompt = (savedPrompt: SavedPrompt) => {
    onPromptSettingsChange({
      promptText: savedPrompt.promptText,
      temperature: savedPrompt.temperature,
    });
    setLabel(savedPrompt.label);
    setInputValue(savedPrompt.label);
    setPreviousLabel(savedPrompt.label);
    setIsOpen(false);
    toast({
      title: `Loaded prompt: ${savedPrompt.label}`,
      duration: 1500,
    });
  };

  // Get unique labels for the dropdown
  const uniqueLabels = Array.from(
    new Set(savedPrompts.map((p) => p.label))
  ).sort();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && inputValue.trim()) {
      setLabel(inputValue);
      savePrompt(inputValue);
      setPreviousLabel(inputValue);
      setIsOpen(false);
    }
  };

  const handleLabelBlur = () => {
    if (inputValue !== previousLabel && inputValue.trim()) {
      setLabel(inputValue);
      savePrompt(inputValue);
      setPreviousLabel(inputValue);
    }
  };

  const handlePromptBlur = () => {
    // Save when the textarea loses focus if there's a label
    if (label.trim()) {
      savePrompt(label);
    }
    // Also check if inputValue changed when prompt blurs
    if (inputValue !== previousLabel && inputValue.trim()) {
      setLabel(inputValue);
      setPreviousLabel(inputValue);
    }
    onBlur?.();
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(promptSettings.promptText);
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
      onPromptSettingsChange({
        ...promptSettings,
        promptText: text,
      });
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

  const handleTemperatureChange = (value: string) => {
    const numValue = parseFloat(value);
    onPromptSettingsChange({
      ...promptSettings,
      temperature: numValue,
    });
  };

  return (
    <Card className="p-4 flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h3 className="text-lg font-bold text-gray-900">Prompt</h3>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <span className="text-xs text-gray-600">Label:</span>
            <Popover open={isOpen} onOpenChange={setIsOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={isOpen}
                  className="w-64 h-7 text-xs justify-between font-normal"
                  onClick={() => setInputValue(label)}
                >
                  {label || "Enter label..."}
                  <ChevronDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0">
                <Command shouldFilter={false}>
                  <div className="flex items-center border-b px-3">
                    <input
                      placeholder="Choose a label or enter a new one"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <CommandList>
                    <CommandEmpty>No saved prompts found.</CommandEmpty>
                    {uniqueLabels.length > 0 && (
                      <CommandGroup heading="Saved Labels">
                        {uniqueLabels.map((savedLabel) => {
                          const latestPrompt = savedPrompts
                            .filter((p) => p.label === savedLabel)
                            .sort((a, b) => b.timestamp - a.timestamp)[0];

                          return (
                            <CommandItem
                              key={savedLabel}
                              value={savedLabel}
                              onSelect={() => loadPrompt(latestPrompt)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  label === savedLabel
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {savedLabel}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-xs text-gray-600">Temp:</span>
            <Select
              value={promptSettings.temperature.toString()}
              onValueChange={handleTemperatureChange}
            >
              <SelectTrigger className="w-16 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 11 }, (_, i) => i / 10).map((temp) => (
                  <SelectItem key={temp} value={temp.toString()}>
                    {temp.toFixed(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="ghost" size="sm" onClick={copyPrompt}>
            <Copy className="w-4 h-4" />
          </Button>
          <Button onClick={pastePrompt} variant="ghost" size="sm">
            <Clipboard className="h-4 w-4 mr-2" />
          </Button>
        </div>
      </div>

      <Textarea
        value={promptSettings.promptText}
        onChange={(e) =>
          onPromptSettingsChange({
            ...promptSettings,
            promptText: e.target.value,
          })
        }
        className="flex-1 resize-none font-mono text-sm min-h-0"
        placeholder="Enter your prompt here..."
        onBlur={handlePromptBlur}
      />
    </Card>
  );
};
