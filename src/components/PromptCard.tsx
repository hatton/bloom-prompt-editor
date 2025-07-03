import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Copy, Clipboard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PromptCardProps {
  promptText: string;
  onPromptChange: (text: string) => void;
  onBlur?: () => void;
}

export const PromptCard = ({
  promptText,
  onPromptChange,
  onBlur,
}: PromptCardProps) => {
  const { toast } = useToast();

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
      onPromptChange(text);
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

  return (
    <Card className="p-4 flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h3 className="text-lg font-bold text-gray-900">Prompt</h3>
        <div className="flex space-x-2">
          <Button variant="ghost" size="sm" onClick={copyPrompt}>
            <Copy className="w-4 h-4" />
          </Button>
          <Button onClick={pastePrompt} variant="ghost" size="sm">
            <Clipboard className="h-4 w-4 mr-2" />
          </Button>
        </div>
      </div>
      <Textarea
        value={promptText}
        onChange={(e) => onPromptChange(e.target.value)}
        className="flex-1 resize-none font-mono text-sm min-h-0"
        placeholder="Enter your prompt here..."
        onBlur={onBlur}
      />
    </Card>
  );
};
