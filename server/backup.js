import { DatabaseSync, backup } from "node:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
const [mode, source, target] = process.argv.slice(2);
if (
  !["backup", "restore", "check"].includes(mode) ||
  !source ||
  (mode !== "check" && !target)
) {
  console.error(
    "Usage: node server/backup.js backup|restore SOURCE TARGET or check FILE",
  );
  process.exit(1);
}
if (!existsSync(source)) throw Error("Source database does not exist");
if (target && resolve(source) === resolve(target))
  throw Error("Source and target must differ");
if (target && existsSync(target))
  throw Error(
    "Refusing to overwrite an existing file; stop services and use a fresh restore path",
  );
const db = new DatabaseSync(source, { readOnly: true });
if (db.prepare("PRAGMA integrity_check").get().integrity_check !== "ok")
  throw Error("Source integrity check failed");
if (mode === "check") {
  console.log("SQLite integrity: ok");
  db.close();
} else {
  mkdirSync(dirname(target), { recursive: true });
  await backup(db, target);
  db.close();
  const restored = new DatabaseSync(target, { readOnly: true });
  if (restored.prepare("PRAGMA integrity_check").get().integrity_check !== "ok")
    throw Error("Restored integrity check failed");
  console.log(
    mode === "restore"
      ? "Restored and verified"
      : "Backup created and verified",
  );
  restored.close();
}
