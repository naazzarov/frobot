import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import { mkdirSync, chmodSync } from "node:fs";
import { dirname } from "node:path";
import { seedState } from "../public/core.js";

const digest = (value) => createHash("sha256").update(value).digest("hex");
export function openStore(filename) {
  if (filename !== ":memory:")
    mkdirSync(dirname(filename), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(filename);
  if (filename !== ":memory:") chmodSync(filename, 0o600);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS workspace (id INTEGER PRIMARY KEY CHECK(id=1), state TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS audit (seq INTEGER PRIMARY KEY, event TEXT NOT NULL, previous_hash TEXT NOT NULL, hash TEXT NOT NULL);
    CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON audit BEGIN SELECT RAISE(ABORT,'audit is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON audit BEGIN SELECT RAISE(ABORT,'audit is append-only'); END;`);
  let current;
  function verify() {
    let previous = "0".repeat(64),
      expectedSeq = 1;
    for (const row of db.prepare("SELECT * FROM audit ORDER BY seq").all()) {
      if (
        row.seq !== expectedSeq++ ||
        row.previous_hash !== previous ||
        row.hash !== digest(`${row.seq}\n${previous}\n${row.event}`)
      )
        throw Error(
          "Audit hash chain verification failed. Restore a trusted backup.",
        );
      previous = row.hash;
    }
    return { valid: true, count: expectedSeq - 1, head: previous };
  }
  function save(next) {
    // Refuse rewrites of existing audit entries, even from an accidental engine mutation.
    const oldEvents = current?.events || [];
    if (
      next.events.length < oldEvents.length ||
      JSON.stringify(next.events.slice(0, oldEvents.length)) !==
        JSON.stringify(oldEvents)
    )
      throw Error("Existing audit history cannot be changed.");
    db.exec("BEGIN IMMEDIATE");
    try {
      const head = db
        .prepare("SELECT seq, hash FROM audit ORDER BY seq DESC LIMIT 1")
        .get();
      let seq = head?.seq || 0,
        previous = head?.hash || "0".repeat(64);
      const insert = db.prepare(
        "INSERT INTO audit(seq,event,previous_hash,hash) VALUES(?,?,?,?)",
      );
      for (const event of next.events.slice(oldEvents.length)) {
        const json = JSON.stringify(event);
        seq++;
        const hash = digest(`${seq}\n${previous}\n${json}`);
        insert.run(seq, json, previous, hash);
        previous = hash;
      }
      db.prepare(
        "INSERT INTO workspace(id,state) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET state=excluded.state",
      ).run(JSON.stringify(next));
      db.exec("COMMIT");
      current = structuredClone(next);
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
  const row = db.prepare("SELECT state FROM workspace WHERE id=1").get();
  if (row) {
    current = JSON.parse(row.state);
    verify();
    const events = db
      .prepare("SELECT event FROM audit ORDER BY seq")
      .all()
      .map((row) => JSON.parse(row.event));
    if (JSON.stringify(events) !== JSON.stringify(current.events))
      throw Error("Workspace and audit history do not match.");
  } else save(seedState());
  return {
    load: () => structuredClone(current),
    save,
    verify,
    audit: () =>
      db
        .prepare("SELECT * FROM audit ORDER BY seq")
        .all()
        .map((r) => ({ ...r, event: JSON.parse(r.event) })),
    close: () => db.close(),
  };
}
