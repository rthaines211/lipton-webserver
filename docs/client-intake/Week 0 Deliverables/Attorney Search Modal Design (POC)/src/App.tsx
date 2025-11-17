import { useState } from "react";
import { AttorneySearchModal } from "./components/AttorneySearchModal";
import { Button } from "./components/ui/button";

export default function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <h1 className="text-[#212121]">Attorney Intake System</h1>
        <p className="text-[#757575]">Search and manage client intake submissions</p>
        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-[#1976D2] hover:bg-[#1565C0] text-white"
        >
          Open Attorney Search
        </Button>
      </div>

      <AttorneySearchModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen}
      />
    </div>
  );
}
