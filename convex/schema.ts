import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
export const menuFields = {
  slug: v.string(),
  name: v.string(),
  description: v.string(),
  category: v.string(),
  price: v.union(v.number(), v.null()),
  image: v.string(),
  options: v.array(
    v.object({
      name: v.string(),
      choices: v.array(v.object({ label: v.string(), extra: v.number() })),
    }),
  ),
  available: v.boolean(),
  published: v.boolean(),
  sortOrder: v.number(),
};
export const eventFields = {
  title: v.string(),
  description: v.string(),
  schedule: v.string(),
  image: v.string(),
  published: v.boolean(),
  sortOrder: v.number(),
};
export const settingFields = {
  phone: v.string(),
  address: v.string(),
  hours: v.string(),
  orderingUrl: v.string(),
  bookingUrl: v.string(),
};
export const reservationStatus = v.union(
  v.literal("pending"),
  v.literal("confirmed"),
  v.literal("declined"),
  v.literal("cancelled"),
);
export default defineSchema({
  reservations: defineTable({
    requestKey: v.string(),
    reference: v.string(),
    name: v.string(),
    phone: v.string(),
    date: v.string(),
    time: v.string(),
    party: v.number(),
    notes: v.string(),
    status: reservationStatus,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_request", ["requestKey"])
    .index("by_phone_created", ["phone", "createdAt"])
    .index("by_status_date", ["status", "date"])
    .index("by_created", ["createdAt"]),
  users: defineTable({
    username: v.string(),
    role: v.union(v.literal("admin"), v.literal("employee")),
    salt: v.string(),
    hash: v.string(),
    active: v.boolean(),
    createdAt: v.number(),
  }).index("by_username", ["username"]),
  sessions: defineTable({
    tokenHash: v.string(),
    userId: v.id("users"),
    expiresAt: v.number(),
  }).index("by_token", ["tokenHash"]),
  loginAttempts: defineTable({
    username: v.string(),
    failures: v.number(),
    locked: v.boolean(),
    updatedAt: v.number(),
  }).index("by_username", ["username"]),
  menuItems: defineTable({ ...menuFields, updatedAt: v.number() }).index(
    "by_slug",
    ["slug"],
  ),
  events: defineTable({ ...eventFields, updatedAt: v.number() }),
  settings: defineTable({ ...settingFields, key: v.string() }).index("by_key", [
    "key",
  ]),
});
