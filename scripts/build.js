import { cpSync, mkdirSync, rmSync } from "node:fs";
// Buildless source; package an exact copy for static hosts that expect dist/.
rmSync("dist", { recursive: true, force: true });
mkdirSync("dist", { recursive: true });
cpSync("public", "dist", { recursive: true });
console.log("Static sandbox prepared in dist/.");
