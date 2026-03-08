import { Routes, Route } from "react-router-dom";
import { UploadArea } from "./UploadArea";
import { TranscriptView } from "./TranscriptView";

export function ContentPane() {
  return (
    <main className="relative flex flex-1 flex-col overflow-hidden bg-[#0c0c1d]">
      {/* Faint noise texture overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:url('data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%20256%20256%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cfilter%20id%3D%22n%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.9%22%20numOctaves%3D%224%22%20stitchTiles%3D%22stitch%22%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%22256%22%20height%3D%22256%22%20filter%3D%22url(%23n)%22%20opacity%3D%221%22%2F%3E%3C%2Fsvg%3E')] [background-size:128px_128px]" />

      <Routes>
        <Route
          index
          element={
            <UploadArea
              onSuccess={() => {
                /* polling handles refresh */
              }}
            />
          }
        />
        <Route path=":id" element={<TranscriptView />} />
      </Routes>
    </main>
  );
}
