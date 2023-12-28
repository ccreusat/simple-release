import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import json from "@rollup/plugin-json";

import { readFileSync } from "fs";

const pkg = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf8")
);
console.log(`Running version ${pkg.version}`);

export default {
  input: "src/index.ts",
  output: {
    dir: "./dist",
    format: "es",
  },
  watch: {
    include: "src/**",
  },
  external: [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ],
  plugins: [
    json(),
    resolve({ extensions: [".js", ".ts"] }),
    commonjs(),
    typescript({ outDir: "./dist", tsconfig: "./tsconfig.json" }),
  ],
};
