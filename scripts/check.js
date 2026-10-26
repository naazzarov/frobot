import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
const files = [];
for (const dir of ["src", "public", "scripts", "test"])
  for (const entry of readdirSync(dir))
    if (entry.endsWith(".js")) files.push(join(dir, entry));
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], {
    stdio: "inherit",
  });
  if (result.status) process.exit(result.status);
}
for (const file of [...files, "README.md", ".env.example"]) {
  const content = readFileSync(file, "utf8");
  if (
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:sk-ant-api\d+-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{30,})/.test(
      content,
    )
  ) {
    console.error(`Possible credential in ${file}`);
    process.exit(1);
  }
}
console.log(
  `Syntax checks passed for ${files.length} JavaScript files. Credential-pattern scan passed.`,
);
