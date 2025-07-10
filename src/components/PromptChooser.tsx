import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Prompt = Tables<"prompt">;

interface PromptChooserProps {
  selectedPromptId?: number | null;
  onPromptChange?: (promptId: number | null) => void;
  className?: string;
  placeholder?: string;
  width?: string;
}

export const PromptChooser = ({
  selectedPromptId: externalSelectedPromptId,
  onPromptChange: externalOnPromptChange,
  className,
  placeholder = "Select a prompt",
  width = "w-[200px]",
}: PromptChooserProps) => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [internalSelectedPromptId, setInternalSelectedPromptId] =
    useLocalStorage<number | null>("currentPromptId", null);

  // Use external state if provided, otherwise use internal state
  const selectedPromptId =
    externalSelectedPromptId !== undefined
      ? externalSelectedPromptId
      : internalSelectedPromptId;

  const onPromptChange = externalOnPromptChange || setInternalSelectedPromptId;

  // Load prompts from database
  useEffect(() => {
    const loadPrompts = async () => {
      try {
        const { data, error } = await supabase
          .from("prompt")
          .select("*")
          .not("label", "is", null)
          .not("label", "eq", "")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setPrompts(data || []);
      } catch (error) {
        console.error("Error loading prompts:", error);
        setPrompts([]);
      }
    };

    loadPrompts();
  }, []);

  // Find the selected prompt
  const selectedPrompt = prompts.find(
    (prompt) => prompt.id === selectedPromptId
  );

  const handlePromptChange = (value: string) => {
    const promptId = value === "none" ? null : parseInt(value, 10);
    onPromptChange(promptId);
  };

  return (
    <Select
      value={selectedPromptId?.toString() || "none"}
      onValueChange={handlePromptChange}
    >
      <SelectTrigger className={`${width} ${className || ""}`}>
        <SelectValue placeholder={placeholder} className="text-left truncate">
          {selectedPrompt?.label || placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">
          <span className="text-gray-500">None selected</span>
        </SelectItem>
        {prompts.map((prompt) => (
          <SelectItem key={prompt.id} value={prompt.id.toString()}>
            <div className="flex flex-col">
              <span className="font-medium">{prompt.label}</span>
              {prompt.user_prompt && (
                <span className="text-xs text-gray-500 truncate max-w-[300px]">
                  {prompt.user_prompt.substring(0, 100)}
                  {prompt.user_prompt.length > 100 ? "..." : ""}
                </span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
