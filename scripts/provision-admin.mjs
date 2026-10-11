// Run once for a new production deployment. Secrets stay out of terminal output.
import { randomBytes, scryptSync } from "node:crypto";
import { mkdir, writeFile, access } from "node:fs/promises";
import { spawnSync } from "node:child_process";
const destination = ".local/admin-access.txt";
try {
  await access(destination);
  throw new Error("Credentials already exist. Refusing to replace them.");
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
const username = "fishntingzadmin",
  password = randomBytes(21).toString("base64url"),
  salt = randomBytes(16).toString("hex"),
  pepper = randomBytes(32).toString("hex");
const hash = scryptSync(password + "\0" + pepper, salt, 64, {
  N: 32768,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
}).toString("hex");
await mkdir(".local", { recursive: true, mode: 0o700 });
await writeFile(
  destination,
  `Fish N Tingz production admin\nURL: https://reimage-demo.github.io/fish-n-tingz-admin/\nUsername: ${username}\nPassword: ${password}\n`,
  { mode: 0o600, flag: "wx" },
);
for (const [name, value] of Object.entries({
  ADMIN_USERNAME: username,
  ADMIN_PASSWORD_HASH: hash,
  ADMIN_PASSWORD_SALT: salt,
  AUTH_PEPPER: pepper,
})) {
  const r = spawnSync("npx", ["convex", "env", "set", name, "--prod"], {
    input: value,
    encoding: "utf8",
  });
  if (r.status !== 0) throw new Error("Could not configure " + name);
  console.log("Configured " + name);
}
const result = spawnSync(
  "npx",
  ["convex", "run", "accounts:bootstrap", "--prod"],
  { encoding: "utf8" },
);
if (result.status !== 0) throw new Error(result.stderr);
console.log(
  "Production administrator created. Credentials saved privately to " +
    destination,
);
