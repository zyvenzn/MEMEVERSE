import { cp, mkdir, rm } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const outputs = ["dist", "public"];
for (const folder of outputs) {
  const target = new URL("../" + folder + "/", import.meta.url);
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  for (const file of ["index.html", "app.js", "style.css", "manifest.webmanifest", "sw.js"]) {
    await cp(new URL(file, root), new URL(file, target));
  }
  await cp(new URL("assets/", root), new URL("assets/", target), { recursive: true });
}
console.log("Prepared Capacitor bundle in dist/ and Vercel static output in public/");
