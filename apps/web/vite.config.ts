import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss(), solid()],
  resolve: {
    tsconfigPaths: true,
    noExternal: ["@kobalte/core"],
  },
  optimizeDeps: {
    include: ["marked", "dompurify"],
  },
});
