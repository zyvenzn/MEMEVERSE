import { cp, mkdir, rm } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const dist = new URL("../dist/", import.meta.url);
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const file of ["index.html", "app.js", "style.css", "manifest.webmanifest", "sw.js"]) {
  await cp(new URL(file, root), new URL(file, dist));
}
await cp(new URL("assets/", root), new URL("assets/", dist), { recursive: true });
console.log("Prepared offline web bundle in dist/");
