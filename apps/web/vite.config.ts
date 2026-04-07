import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    __PLATFORM__: JSON.stringify("web"),
  },
  optimizeDeps: {
    exclude: ["sql.js"],
  },
});
