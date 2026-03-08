import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Landing } from "./landing/Landing";
import { V1App } from "./versions/v1/App";
import { V2App } from "./versions/v2/App";
import { V3App } from "./versions/v3/App";
import { V4App } from "./versions/v4/App";
import { V5App } from "./versions/v5/App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/1/*" element={<V1App />} />
        <Route path="/2/*" element={<V2App />} />
        <Route path="/3/*" element={<V3App />} />
        <Route path="/4/*" element={<V4App />} />
        <Route path="/5/*" element={<V5App />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
