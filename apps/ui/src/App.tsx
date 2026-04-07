import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/layout/Sidebar";
import Header from "./components/layout/Header";
import Dashboard from "./components/dashboard/Dashboard";
import BrowseView from "./components/browse/BrowseView";
import StudySession from "./components/study/StudySession";
import Settings from "./components/settings/Settings";
import ToastContainer from "./components/Toast";

export default function App() {
  return (
    <div className="flex h-screen bg-cream text-gray-900">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/browse" element={<BrowseView />} />
            <Route path="/browse/:vedaId" element={<BrowseView />} />
            <Route path="/browse/:vedaId/:divisionId" element={<BrowseView />} />
            <Route path="/browse/:vedaId/:divisionId/:subdivisionId" element={<BrowseView />} />
            <Route path="/study" element={<StudySession />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
