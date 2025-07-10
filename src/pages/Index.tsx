import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RunsTab } from "@/components/RunsTab";
import { InputBooksTab } from "@/components/InputBooksTab";
import { SettingsTab } from "@/components/SettingsTab";
import { EvalTab } from "@/components/EvalTab";
import { useLocalStorage } from "@/hooks/useLocalStorage";

const Index = () => {
  const [activeTab, setActiveTab] = useState("runs");
  const [isReady, setIsReady] = useState(false);
  const [apiKey] = useLocalStorage<string>("openRouterApiKey", "");

  // Check initial readiness state on mount
  useEffect(() => {
    setIsReady(!!apiKey);

    // If no API key, automatically switch to settings tab
    if (!apiKey) {
      setActiveTab("settings");
    }
  }, [apiKey]);

  const handleReadinessChanged = useCallback((ready: boolean) => {
    setIsReady(ready);
  }, []);

  return (
    <div className="h-screen bg-gray-500 flex flex-col">
      <div className="px-4 py-6 flex-1 flex flex-col min-h-0">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden flex-1 flex flex-col">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full h-full flex flex-col"
          >
            <TabsList className="flex justify-start bg-gray-100 p-0 border-b border-gray-200 flex-shrink-0 w-full">
              <TabsTrigger
                value="settings"
                className="font-bold px-6 py-3 bg-transparent  mr-1 data-[state=active]:bg-card  data-[state=active]:border-b-white data-[state=active]:text-blue-600 data-[state=active]:relative data-[state=active]:z-10 hover:bg-gray-50"
              >
                Settings
              </TabsTrigger>
              <TabsTrigger
                value="input-books"
                disabled={!isReady}
                className="font-bold px-6 py-3 bg-transparent  mr-1 data-[state=active]:bg-card data-[state=active]:border-b-white data-[state=active]:text-blue-600 data-[state=active]:relative data-[state=active]:z-10 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                Input Books
              </TabsTrigger>
              <TabsTrigger
                value="runs"
                disabled={!isReady}
                className="font-bold px-6 py-3 bg-transparent  mr-1 data-[state=active]:bg-card  data-[state=active]:border-b-white data-[state=active]:text-blue-600 data-[state=active]:relative data-[state=active]:z-10 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                Runs
              </TabsTrigger>
              <TabsTrigger
                value="evals"
                disabled={!isReady}
                className="font-bold px-6 py-3 bg-transparent  mr-1 data-[state=active]:bg-card  data-[state=active]:border-b-white data-[state=active]:text-blue-600 data-[state=active]:relative data-[state=active]:z-10 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                Evals
              </TabsTrigger>
            </TabsList>
            <TabsContent value="settings" className="p-0 mt-0 flex-1 min-h-0">
              <SettingsTab ReadinessChanged={handleReadinessChanged} />
            </TabsContent>
            <TabsContent
              value="input-books"
              className="p-0 mt-0 flex-1 min-h-0"
            >
              <InputBooksTab />
            </TabsContent>

            <TabsContent value="runs" className="p-0 mt-0 flex-1 min-h-0">
              <RunsTab />
            </TabsContent>

            <TabsContent value="evals" className="p-0 mt-0 flex-1 min-h-0">
              <EvalTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Index;
