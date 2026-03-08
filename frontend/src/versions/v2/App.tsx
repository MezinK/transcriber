import { Sidebar } from "./Sidebar";
import { ContentPane } from "./ContentPane";

export function V2App() {
  return (
    <div className="flex h-screen min-h-screen overflow-hidden">
      <Sidebar />
      <ContentPane />
    </div>
  );
}
