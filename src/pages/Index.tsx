
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RunsTab } from "@/components/RunsTab";
import { InputBooksTab } from "@/components/InputBooksTab";

const Index = () => {
  const [activeTab, setActiveTab] = useState("runs");

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-50 p-1 rounded-none border-b">
              <TabsTrigger 
                value="input-books" 
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500"
              >
                Input Books
              </TabsTrigger>
              <TabsTrigger 
                value="runs"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500"
              >
                Runs
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="input-books" className="p-0 mt-0">
              <InputBooksTab />
            </TabsContent>
            
            <TabsContent value="runs" className="p-0 mt-0">
              <RunsTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Index;
