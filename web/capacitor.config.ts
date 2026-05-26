import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.noshtek.debtos",
  appName: "DebtOS",
  webDir: "out",
  android: {
    allowMixedContent: false,
    captureInput: true,
  },
};

export default config;
