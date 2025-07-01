import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const API_KEY_STORAGE_KEY = "openRouterApiKey";

interface SettingsTabProps {
  ReadinessChanged: (isReady: boolean) => void;
}

export const SettingsTab = ({ ReadinessChanged }: SettingsTabProps) => {
  const [openRouterApiKey, setOpenRouterApiKey] = useState<string>("");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const storedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedApiKey) {
      setOpenRouterApiKey(storedApiKey);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      if (openRouterApiKey) {
        localStorage.setItem(API_KEY_STORAGE_KEY, openRouterApiKey);
      } else {
        localStorage.removeItem(API_KEY_STORAGE_KEY);
      }
      // Call the readiness callback whenever the API key changes
      ReadinessChanged(!!openRouterApiKey);
    }
  }, [openRouterApiKey, isLoaded, ReadinessChanged]);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOpenRouterApiKey(e.target.value);
  };

  return (
    <div className="p-6">
      <div className="space-y-4 max-w-[40em]">
        <div className="space-y-2">
          <Label htmlFor="api-key">Open Router API Key</Label>
          <Input
            id="api-key"
            placeholder="Enter your Open Router API Key"
            value={openRouterApiKey}
            onChange={handleApiKeyChange}
          />
          <p className="text-sm text-gray-500">
            Your API key is stored securely in your browser's local storage.
          </p>
        </div>
      </div>
    </div>
  );
};
