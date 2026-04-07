import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { WasmAdapter } from "@adhyayanam/db-adapters";
import { DbProvider } from "@adhyayanam/ui/context/DbContext";
import App from "@adhyayanam/ui/App";
import "@adhyayanam/ui/styles/globals.css";

const root = document.getElementById("root")!;

// Show loading state while DB initializes
root.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;color:#78350f">Loading Adhyayanam...</div>';

const adapter = new WasmAdapter("/adhyayanam.db");

adapter.init().then(() => {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <DbProvider adapter={adapter}>
        <HashRouter>
          <App />
        </HashRouter>
      </DbProvider>
    </React.StrictMode>
  );
}).catch((err) => {
  root.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;color:#991b1b">Failed to load database: ${err.message}</div>`;
});
