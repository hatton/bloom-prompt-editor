import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useSettings } from "@/hooks/useSettings";

interface SettingsTabProps {
  ReadinessChanged: (isReady: boolean) => void;
}

export const SettingsTab = ({ ReadinessChanged }: SettingsTabProps) => {
  const { openRouterApiKey, setOpenRouterApiKey, isLoaded } = useSettings();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Get current user
    const getCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };

    getCurrentUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      // Call the readiness callback whenever the API key changes
      ReadinessChanged(!!openRouterApiKey);
    }
  }, [openRouterApiKey, isLoaded, ReadinessChanged]);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOpenRouterApiKey(e.target.value);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
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
        <br />
        <br />
        <br />
        <br />
        <br />
        <br />
        <br />
        <br />
        {user && (
          <div className="border-t pt-4 space-y-2">
            <p className="text-sm text-gray-700">
              Logged in as: <span className="font-medium">{user.email}</span>
            </p>
            <Button onClick={handleLogout} size="sm">
              Logout
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
