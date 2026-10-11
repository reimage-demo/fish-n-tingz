import { build } from "esbuild";
import { mkdir } from "node:fs/promises";

// Checked in so root HTML works in any static server, including VS Code Live Server.
// Refresh from the locked npm dependency whenever the public site is built.
await mkdir("vendor", { recursive: true });
await build({
  stdin: {
    contents: 'export { ConvexClient } from "convex/browser"; export { anyApi } from "convex/server";',
    resolveDir: process.cwd(),
    sourcefile: "convex-browser-entry.js",
  },
  outfile: "vendor/convex-browser.js",
  bundle: true,
  minify: true,
  format: "esm",
  platform: "browser",
  target: "es2020",
  legalComments: "inline",
});
