import sharp from "sharp";
import { readdir, copyFile } from "node:fs/promises";
for (const file of await readdir("references")) {
  if (!file.endsWith(".jpg") || file.startsWith("IMG_")) continue;
  await sharp(`references/${file}`)
    .rotate()
    .resize({ width: 1000, withoutEnlargement: true })
    .webp({ quality: 84 })
    .toFile(`assets/images/${file.replace(".jpg", ".webp")}`);
}
await sharp("assets/brand/logo-extracted.png")
  .trim()
  .resize({ width: 360 })
  .webp({ quality: 95 })
  .toFile("assets/brand/logo.webp");
await sharp("/Users/stephenbauer/Downloads/unnamed-2.jpg")
  .rotate()
  .webp({ quality: 90 })
  .toFile("assets/images/our-space.webp");
await copyFile(
  "assets/brand/logo.webp",
  "admin-portal/public/assets/logo.webp",
);
