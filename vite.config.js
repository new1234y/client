import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [],
      manifest: {
        name: "Chase GPS",
        short_name: "Chase GPS",
        description: "Jeu de poursuite géolocalisé",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        start_url: "/",
        icons: [],
      },
    }),
  ],
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api": { target: "http://localhost:3001", changeOrigin: true },
    },
  },
});
