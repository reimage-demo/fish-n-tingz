import { expect, test } from "vitest";
import { build } from "esbuild";

test("public HTML entry resolves without npm package imports in a static server", async () => {
  const result = await build({
    entryPoints: ["shared.js"],
    bundle: true,
    packages: "external",
    platform: "browser",
    format: "esm",
    write: false,
    metafile: true,
  });
  const unresolved = Object.values(result.metafile.outputs).flatMap((output) => output.imports);
  expect(unresolved).toEqual([]);
});
