import { rm, mkdir, copyFile, cp, readFile, writeFile } from "node:fs/promises";
import { build } from "esbuild";
import { createHash } from "node:crypto";
import "./build-browser-vendor.mjs";
await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
const pages = [
  "index.html",
  "landing-page.html",
  "menu.html",
  "events.html",
  "contact.html",
  "legal.html",
  "accessibility.html",
  "privacy.html",
  "terms.html",
];
for (const file of [
  ...pages,
  "styles.css",
  "site-policies.css",
  "site-policies.js",
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
// Content-addressed assets prevent cached CSS/JS from mixing with new HTML.
for (const name of ["styles.css", "shared.js", "site-policies.css", "site-policies.js"]) {
  const bytes = await readFile(`dist/${name}`);
  const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 12);
  const [stem, extension] = name.split(".");
  const versioned = `${stem}-${hash}.${extension}`;
  await writeFile(`dist/${versioned}`, bytes);
  for (const page of pages) {
    const html = await readFile(`dist/${page}`, "utf8");
    await writeFile(
      `dist/${page}`,
      html.replaceAll(`"${name}"`, `"${versioned}"`),
    );
  }
}
console.log("Public HTML/CSS/JS site built in dist/");
