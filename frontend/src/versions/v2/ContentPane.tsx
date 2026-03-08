import { Routes, Route } from "react-router-dom";
import { UploadArea } from "./UploadArea";
import { TranscriptView } from "./TranscriptView";

export function ContentPane() {
  return (
    <main className="flex flex-1 flex-col overflow-hidden bg-white">
      <Routes>
        <Route
          index
          element={<UploadArea onSuccess={() => { /* polling handles refresh */ }} />}
        />
        <Route path=":id" element={<TranscriptView />} />
      </Routes>
    </main>
  );
}
