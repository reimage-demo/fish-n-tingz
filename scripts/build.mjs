import { rm, mkdir, copyFile, cp } from "node:fs/promises";
import { build } from "esbuild";
await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
for (const file of [
  "index.html",
  "menu.html",
  "events.html",
  "contact.html",
  "styles.css",
  "catalog.js",
  "public-config.js",
])
  await copyFile(file, `dist/${file}`);
await cp("assets", "dist/assets", {
  recursive: true,
  filter: (src) => !src.endsWith(".jpg") && !src.endsWith(".png"),
});
await build({
  entryPoints: ["shared.js"],
  outfile: "dist/shared.js",
  bundle: true,
  minify: true,
  format: "esm",
  target: "es2020",
});
console.log("Public HTML/CSS/JS site built in dist/");
