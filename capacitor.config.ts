import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "app.lovable.99646ccc7bdb4b758bff29e4da5b7e04",
  appName: "entrega-financeira-semanal",
  webDir: "dist",
  server: {
    url: "https://99646ccc-7bdb-4b75-8bff-29e4da5b7e04.lovableproject.com?forceHideBadge=true",
    cleartext: true,
  },
  bundledWebRuntime: false,
}

export default config
