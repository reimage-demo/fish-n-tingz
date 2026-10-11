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

test("image backfill fills missing photos and preserves staff edits", async () => {
  const t = make();
  await t.mutation(internal.content.seed, {});
  await t.run(async (ctx) => {
    const rows = await ctx.db.query("menuItems").collect();
    const shrimp = rows.find((item) => item.slug === "shrimp-tacos")!;
    const fries = rows.find((item) => item.slug === "fries")!;
    await ctx.db.patch(shrimp._id, { image: "", price: 19, published: false });
    await ctx.db.patch(fries._id, { image: "https://example.com/staff-photo.webp" });
  });
  expect(await t.mutation(internal.content.backfillMenuImages, {})).toEqual({ updated: 1 });
  const rows = await t.run((ctx) => ctx.db.query("menuItems").collect());
  expect(rows.find((item) => item.slug === "shrimp-tacos")).toMatchObject({
    image: "assets/images/menu-illustration-shrimp-tacos.webp", price: 19, published: false,
  });
  expect(rows.find((item) => item.slug === "fries")?.image).toBe("https://example.com/staff-photo.webp");
  expect(await t.mutation(internal.content.backfillMenuImages, {})).toEqual({ updated: 0 });
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

const tomorrow = () =>
  new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const requestData = () => ({
  requestKey: "12345678-abcd-4abc-abcd-123456789abc",
  name: "Test Guest",
  phone: "(860) 555-0100",
  date: tomorrow(),
  time: "18:00",
  party: 4,
  notes: "Window if possible",
  website: "",
});
test("reservation requests are private, pending, and idempotent", async () => {
  const t = make(),
    input = requestData();
  const result = await t.mutation(api.reservations.request, input);
  expect(result.reference).toMatch(/^FNT-/);
  expect(await t.mutation(api.reservations.request, input)).toEqual(result);
  await expect(
    t.query(api.reservations.list, { token: "public", status: "pending" }),
  ).rejects.toThrow("UNAUTHORIZED");
  const token = await staff(t),
    rows = await t.query(api.reservations.list, { token, status: "pending" });
  expect(rows).toHaveLength(1);
  expect(rows[0].phone).toBe("8605550100");
  expect(await t.query(api.content.publicContent, {})).not.toHaveProperty(
    "reservations",
  );
  await expect(
    t.mutation(api.reservations.setStatus, {
      token: "public",
      id: rows[0]._id,
      status: "confirmed",
    }),
  ).rejects.toThrow("UNAUTHORIZED");
  await t.mutation(api.reservations.setStatus, {
    token,
    id: rows[0]._id,
    status: "confirmed",
  });
  expect(
    await t.query(api.reservations.list, { token, status: "pending" }),
  ).toHaveLength(0);
  expect(
    await t.query(api.reservations.list, { token, status: "confirmed" }),
  ).toHaveLength(1);
});
test("reservation input rejects invalid dates, contacts, party sizes and bots", async () => {
  const t = make();
  for (const invalid of [
    { date: "2020-01-01" },
    { date: "2027-02-30" },
    { time: "25:00" },
    { time: "18:15" },
    { time: "18:45" },
    { phone: "123" },
    { party: 1.5 },
    { party: 21 },
    { name: " " },
    { website: "spam" },
    { notes: "x".repeat(501) },
  ]) {
    await expect(
      t.mutation(api.reservations.request, { ...requestData(), ...invalid }),
    ).rejects.toThrow();
  }
});
test("reservation retries cannot change received details and contact rate is limited", async () => {
  const t = make(),
    input = requestData();
  await t.mutation(api.reservations.request, input);
  await expect(
    t.mutation(api.reservations.request, { ...input, party: 8 }),
  ).rejects.toThrow("previous request");
  for (let i = 2; i <= 3; i++)
    await t.mutation(api.reservations.request, {
      ...input,
      requestKey: input.requestKey.replace("12345678", i + "2345678"),
    });
  await expect(
    t.mutation(api.reservations.request, {
      ...input,
      phone: "+1 860 555 0100",
      requestKey: input.requestKey.replace("12345678", "42345678"),
    }),
  ).rejects.toThrow("several requests");
});
