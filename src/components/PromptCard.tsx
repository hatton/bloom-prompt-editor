import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Clipboard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PromptSettings {
  promptText: string;
  temperature: number;
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
        onBlur={onBlur}
      />
    </Card>
  );
};
