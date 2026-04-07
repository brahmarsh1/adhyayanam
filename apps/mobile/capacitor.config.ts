import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.adhyayanam.app",
  appName: "Adhyayanam",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
