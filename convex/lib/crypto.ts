"use node";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
export function passwordHash(password: string, salt: string, pepper: string) {
  if (!pepper || !/^[a-f0-9]{32,}$/i.test(salt))
    throw new Error("Security configuration unavailable");
  return scryptSync(password + "\0" + pepper, salt, 64, {
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  }).toString("hex");
}
export function matches(a: string, b: string) {
  const left = Buffer.from(a, "hex"),
    right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}
export function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
