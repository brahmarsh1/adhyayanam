import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { TauriAdapter } from "@adhyayanam/db-adapters";
import { DbProvider } from "@adhyayanam/ui/context/DbContext";
import App from "@adhyayanam/ui/App";
import "@adhyayanam/ui/styles/globals.css";

const adapter = new TauriAdapter();

adapter.init().then(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <DbProvider adapter={adapter}>
        <HashRouter>
          <App />
        </HashRouter>
      </DbProvider>
    </React.StrictMode>
  );
});
