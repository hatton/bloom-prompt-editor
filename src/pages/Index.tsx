import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RunsTab } from "@/components/RunsTab";
import { InputBooksTab } from "@/components/InputBooksTab";

const Index = () => {
  const [activeTab, setActiveTab] = useState("runs");

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
                value="input-books"
                className="font-bold px-6 py-3 bg-transparent  mr-1 data-[state=active]:bg-card data-[state=active]:border-b-white data-[state=active]:text-blue-600 data-[state=active]:relative data-[state=active]:z-10 hover:bg-gray-50"
              >
                Input Books
              </TabsTrigger>
              <TabsTrigger
                value="runs"
                className="font-bold px-6 py-3 bg-transparent  mr-1 data-[state=active]:bg-card  data-[state=active]:border-b-white data-[state=active]:text-black data-[state=active]:relative data-[state=active]:z-10 hover:bg-gray-50"
              >
                Runs
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="input-books"
              className="p-0 mt-0 flex-1 min-h-0"
            >
              <InputBooksTab />
            </TabsContent>

            <TabsContent value="runs" className="p-0 mt-0 flex-1 min-h-0">
              <RunsTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Index;
