import { build } from "esbuild";
import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import path from "node:path";
const cssRoot = path.resolve(".next/static/chunks");
const files = await readdir(cssRoot, { recursive: true });
const styles = (
  await Promise.all(
    files
      .filter((f) => f.endsWith(".css"))
      .map((f) => readFile(path.join(cssRoot, f), "utf8")),
  )
).join("\n");
if (!styles)
  throw new Error("Run the production build before exporting the preview.");
const bundle = await build({
  entryPoints: ["preview/entry.tsx"],
  bundle: true,
  write: false,
  minify: true,
  platform: "browser",
  target: ["es2022"],
  define: { "process.env.NODE_ENV": '"production"' },
  jsx: "automatic",
});
const script = bundle.outputFiles[0].text.replaceAll("</script", "<\\/script");
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="STAFTIFY interactive local demo. All data stays in this browser. No account connections required."><title>STAFTIFY · Interactive preview</title><style>${styles.replaceAll("</style", "<\\/style")}</style></head><body><div id="root"></div><script>${script}</script></body></html>`;
await mkdir("preview/dist", { recursive: true });
await writeFile("preview/dist/staftify-demo.html", html);
await writeFile("preview/staftify-demo.html", html);
console.log(
  `Standalone demo created: preview/dist/staftify-demo.html (${Math.round(html.length / 1024)} KB). No server or external requests required.`,
);
