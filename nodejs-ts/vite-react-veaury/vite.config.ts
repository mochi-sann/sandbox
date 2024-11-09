import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import veauryVitePlugins from "veaury/vite/index.js";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // react(),
    veauryVitePlugins({
      type: "react",
      // Configuration of @vitejs/plugin-vue
      // vueOptions: {...},
      // Configuration of @vitejs/plugin-react
      // reactOptions: {...},
      // Configuration of @vitejs/plugin-vue-jsx
      // vueJsxOptions: {...}
    }),
  ],
});
