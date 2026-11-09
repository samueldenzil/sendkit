import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: false,
  sourcemap: true,
  clean: true,
  platform: "node",
  target: "node20",
  outDir: "dist",
  outExtensions: () => ({ js: ".js" }),
  deps: {
    neverBundle: ["commander", "zod", "@samueldenzil-org/sendkit-core"],
  },
});
