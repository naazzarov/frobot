import { DatabaseSync } from "node:sqlite";
import {
  existsSync,
  mkdirSync,
  openSync,
  closeSync,
  rmSync,
  chmodSync,
} from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { openStore } from "../src/store.js";
export function createBackup(source, target) {
  source = resolve(source);
  target = resolve(target);
  if (!existsSync(source) || source === target || !target.endsWith(".sqlite"))
    throw Error("Use an existing source and a different .sqlite target.");
  mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
  const fd = openSync(target, "wx", 0o600);
  closeSync(fd);
  let db;
  try {
    db = new DatabaseSync(source, { readOnly: true });
    db.prepare("VACUUM INTO ?").run(target);
    db.close();
    db = null;
    chmodSync(target, 0o600);
    const restored = openStore(target);
    try {
      const verification = restored.verify();
      return {
        target,
        auditEvents: verification.count,
        auditHead: verification.head,
      };
    } finally {
      restored.close();
    }
  } catch (error) {
    db?.close();
    rmSync(target, { force: true });
    throw error;
  }
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (!process.argv[2])
    throw Error("Usage: npm run backup -- /private/backup/path/frobot.sqlite");
  const result = createBackup(
    resolve(process.env.FROBOT_DATA_DIR || "data", "frobot.sqlite"),
    process.argv[2],
  );
  console.log(JSON.stringify(result));
}
