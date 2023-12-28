import { defineConfig } from "vite";
import { resolve } from "path";
import pkg from "./package.json";

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
      },
      formats: ["es"],
    },
    rollupOptions: {
      external: [...Object.keys(pkg.dependencies || {})],
      /* output: {
        preserveModules: true,
        preserveModulesRoot: "src",
      }, */
    },
  },
});
