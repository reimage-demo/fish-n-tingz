import { expect, test } from "vitest";
import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
import { createHash } from "node:crypto";
const modules = import.meta.glob("../convex/**/*.ts");
const make = () => convexTest(schema, modules);
async function staff(
  t: ReturnType<typeof make>,
  role: "admin" | "employee" = "admin",
  expired = false,
) {
  const token = "a".repeat(64);
  await t.run(async (ctx) => {
    const id = await ctx.db.insert("users", {
      username: "test-admin",
      role,
      salt: "a".repeat(32),
      hash: "b".repeat(128),
      active: true,
      createdAt: Date.now(),
    });
    await ctx.db.insert("sessions", {
      userId: id,
      tokenHash: createHash("sha256").update(token).digest("hex"),
      expiresAt: Date.now() + (expired ? -1 : 100000),
    });
  });
  return token;
}
test("public menu contains the photographed prices and options", async () => {
  const t = make();
  await t.mutation(internal.content.seed, {});
  const r = await t.query(api.content.publicContent, {});
  expect(r.menu).toHaveLength(55);
  expect(r.menu.find((i) => i.slug === "red-snapper")?.price).toBe(32);
  expect(
    r.menu.find((i) => i.slug === "brunch-tower")?.options[1].choices[1].extra,
  ).toBe(30);
  expect(r.menu.find((i) => i.slug === "steak-eggs")?.price).toBeNull();
});
test("anonymous users cannot read the staff dashboard", async () => {
  const t = make();
  await expect(
    t.query(api.content.dashboard, { token: "untrusted" }),
  ).rejects.toThrow("UNAUTHORIZED");
});
test("employees and expired sessions cannot manage content", async () => {
  for (const [role, expired] of [
    ["employee", false],
    ["admin", true],
  ] as const) {
    const t = make();
    const token = await staff(t, role, expired);
    await expect(t.query(api.content.dashboard, { token })).rejects.toThrow(
      "UNAUTHORIZED",
    );
  }
});
test("unpublished items stay out of the public API", async () => {
  const t = make();
  await t.mutation(internal.content.seed, {});
  const token = await staff(t);
  const r = await t.query(api.content.dashboard, { token });
  const { _id, _creationTime, updatedAt, ...item } = r.menu[0];
  await t.mutation(api.content.saveMenu, {
    token,
    id: _id,
    ...item,
    published: false,
  });
  expect(
    (await t.query(api.content.publicContent, {})).menu.some(
      (x) => x._id === _id,
    ),
  ).toBe(false);
});
test("admin edits propagate and unsafe booking URLs are refused", async () => {
  const t = make();
  await t.mutation(internal.content.seed, {});
  const token = await staff(t);
  const data = await t.query(api.content.dashboard, { token });
  const { _id, _creationTime, key, ...settings } = data.settings!;
  await expect(
    t.mutation(api.content.saveSettings, {
      token,
      ...settings,
      bookingUrl: "javascript:alert(1)",
    }),
  ).rejects.toThrow();
  await t.mutation(api.content.saveSettings, {
    token,
    ...settings,
    bookingUrl: "https://appispot.com/space/example",
  });
  expect(
    (await t.query(api.content.publicContent, {})).settings?.bookingUrl,
  ).toBe("https://appispot.com/space/example");
});
test("logout invalidates a staff session", async () => {
  const t = make(),
    token = await staff(t);
  expect(await t.query(api.auth.me, { token })).not.toBeNull();
  await t.mutation(api.auth.logout, { token });
  expect(await t.query(api.auth.me, { token })).toBeNull();
  await expect(t.query(api.content.dashboard, { token })).rejects.toThrow();
});
test("seeding cannot overwrite an established menu", async () => {
  const t = make();
  await t.mutation(internal.content.seed, {});
  await expect(t.mutation(internal.content.seed, {})).rejects.toThrow(
    "Already seeded",
  );
  expect((await t.query(api.content.publicContent, {})).menu.length).toBe(55);
});
test("disabled accounts immediately lose access", async () => {
  const t = make(),
    token = await staff(t);
  await t.run(async (ctx) => {
    const u = await ctx.db.query("users").first();
    await ctx.db.patch(u!._id, { active: false });
  });
  expect(await t.query(api.auth.me, { token })).toBeNull();
});
