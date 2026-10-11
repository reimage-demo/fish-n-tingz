import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireStaff } from "./auth";
import { menuFields, eventFields, settingFields } from "./schema";
import { menu, events, settings } from "./seedData";
function url(value: string) {
  if (value && !/^https:\/\//.test(value))
    throw new Error("Use a secure https:// URL.");
}
export const publicContent = query({
  args: {},
  handler: async (ctx) => ({
    menu: (await ctx.db.query("menuItems").collect())
      .filter((i) => i.published)
      .sort((a, b) => a.sortOrder - b.sortOrder),
    events: (await ctx.db.query("events").collect())
      .filter((i) => i.published)
      .sort((a, b) => a.sortOrder - b.sortOrder),
    settings: await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "main"))
      .unique(),
  }),
});
export const dashboard = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireStaff(ctx, token, true);
    return {
      menu: await ctx.db.query("menuItems").collect(),
      events: await ctx.db.query("events").collect(),
      settings: await ctx.db
        .query("settings")
        .withIndex("by_key", (q) => q.eq("key", "main"))
        .unique(),
    };
  },
});
export const saveMenu = mutation({
  args: { token: v.string(), id: v.id("menuItems"), ...menuFields },
  handler: async (ctx, { token, id, ...data }) => {
    await requireStaff(ctx, token, true);
    if (
      !data.name.trim() ||
      data.name.length > 120 ||
      data.description.length > 1500 ||
      (data.price !== null &&
        (!Number.isFinite(data.price) || data.price < 0)) ||
      data.options.some((o) => o.choices.some((c) => c.extra < 0))
    )
      throw new Error("Check the menu name and prices.");
    if (
      data.image &&
      !/^(assets\/images\/[a-z0-9-]+\.webp|https:\/\/)/.test(data.image)
    )
      throw new Error("Invalid image URL");
    await ctx.db.patch(id, { ...data, updatedAt: Date.now() });
  },
});
export const saveEvent = mutation({
  args: { token: v.string(), id: v.optional(v.id("events")), ...eventFields },
  handler: async (ctx, { token, id, ...data }) => {
    await requireStaff(ctx, token, true);
    if (
      !data.title.trim() ||
      data.title.length > 120 ||
      data.description.length > 1500 ||
      data.schedule.length > 300
    )
      throw new Error("Check event details.");
    if (
      data.image &&
      !/^(assets\/images\/[a-z0-9-]+\.webp|https:\/\/)/.test(data.image)
    )
      throw new Error("Invalid image URL");
    const value = { ...data, updatedAt: Date.now() };
    if (id) await ctx.db.patch(id, value);
    else await ctx.db.insert("events", value);
  },
});
export const saveSettings = mutation({
  args: { token: v.string(), ...settingFields },
  handler: async (ctx, { token, ...data }) => {
    await requireStaff(ctx, token, true);
    url(data.orderingUrl);
    url(data.bookingUrl);
    const old = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "main"))
      .unique();
    if (old) await ctx.db.patch(old._id, data);
    else await ctx.db.insert("settings", { ...data, key: "main" });
  },
});
export const seed = internalMutation({
  args: {},
  handler: async (ctx) => {
    if (await ctx.db.query("menuItems").first())
      throw new Error("Already seeded; existing content preserved.");
    for (const item of menu)
      await ctx.db.insert("menuItems", { ...item, updatedAt: Date.now() });
    for (const event of events)
      await ctx.db.insert("events", { ...event, updatedAt: Date.now() });
    await ctx.db.insert("settings", { ...settings, key: "main" });
    return { items: menu.length, events: events.length };
  },
});

// Add the published artwork without replacing staff-uploaded photos or menu edits.
export const backfillMenuImages = internalMutation({
  args: {},
  handler: async (ctx) => {
    let updated = 0;
    for (const item of await ctx.db.query("menuItems").collect()) {
      const image = menu.find((original) => original.slug === item.slug)?.image;
      if (item.image || !image) continue;
      await ctx.db.patch(item._id, { image, updatedAt: Date.now() });
      updated++;
    }
    return { updated };
  },
});
