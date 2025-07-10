import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { getModels } from "@/integrations/openrouter/openRouterClient";

interface OpenRouterModel {
  id: string;
  name: string;
}

interface ModelChooserProps {
  selectedModel?: string;
  onModelChange?: (value: string) => void;
  className?: string;
  placeholder?: string;
  width?: string;
}

export const ModelChooser = ({
  selectedModel: externalSelectedModel,
  onModelChange: externalOnModelChange,
  className,
  placeholder = "Select a model",
  width = "w-[150px]",
}: ModelChooserProps) => {
  const [models, setModels] = useState<OpenRouterModel[]>([]);
  const [internalSelectedModel, setInternalSelectedModel] = useLocalStorage<string>(
    "selectedModel",
    "google/gemini-flash-1.5"
  );

  // Use external state if provided, otherwise use internal state
  const selectedModel = externalSelectedModel !== undefined ? externalSelectedModel : internalSelectedModel;
  const onModelChange = externalOnModelChange || setInternalSelectedModel;

  // Load models on component mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        const modelsData = await getModels();
        setModels(modelsData);
      } catch (error) {
        console.error("Error loading models:", error);
      }
    };

    loadModels();
  }, []);

  return (
    <Select value={selectedModel} onValueChange={onModelChange}>
      <SelectTrigger className={`${width} ${className || ""}`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {models.map((model) => (
          <SelectItem key={model.id} value={model.id}>
            {model.name.replace(/^Google:\s*/, "")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
