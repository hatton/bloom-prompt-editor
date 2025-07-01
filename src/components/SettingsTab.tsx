import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useSettings } from "@/hooks/useSettings";

export const SettingsTab = () => {
  const { openRouterApiKey, setOpenRouterApiKey } = useSettings();

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Settings</h2>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="api-key">Open Router API Key</Label>
          <Input
            id="api-key"
            type="password"
            placeholder="Enter your Open Router API Key"
            value={openRouterApiKey}
            onChange={(e) => setOpenRouterApiKey(e.target.value)}
          />
          <p className="text-sm text-gray-500">
            Your API key is stored securely in your browser's local storage.
          </p>
        </div>
      </div>
    </div>
  );
};
