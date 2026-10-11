import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { requireStaff } from "./auth";
import { reservationStatus } from "./schema";
export const request = mutation({
  args: {
    requestKey: v.string(),
    name: v.string(),
    phone: v.string(),
    date: v.string(),
    time: v.string(),
    party: v.number(),
    notes: v.string(),
    website: v.string(),
  },
  handler: async (ctx, input) => {
    const name = input.name.trim(),
      phone = input.phone.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, ""),
      notes = input.notes.trim();
    if (input.website || !/^[a-f0-9-]{36}$/.test(input.requestKey))
      throw new ConvexError("Please reload the page and try again.");
    if (
      name.length < 2 ||
      name.length > 80 ||
      !/^\d{10,15}$/.test(phone) ||
      notes.length > 500 ||
      !Number.isInteger(input.party) ||
      input.party < 1 ||
      input.party > 20
    )
      throw new ConvexError(
        "Check your name, phone number, and party size (1–20 guests).",
      );
    const data = {
      name,
      phone,
      date: input.date,
      time: input.time,
      party: input.party,
      notes,
    };
    const existing = await ctx.db
      .query("reservations")
      .withIndex("by_request", (q) => q.eq("requestKey", input.requestKey))
      .unique();
    if (existing) {
      if (
        Object.entries(data).some(
          ([key, value]) => existing[key as keyof typeof data] !== value,
        )
      )
        throw new ConvexError(
          "A previous request was received. Please reload before making a different request.",
        );
      return { reference: existing.reference };
    }
    const now = Date.now();
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const part = (type: string) => parts.find((p) => p.type === type)!.value;
    const localNow = `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
    const parsed = Date.parse(input.date + "T12:00:00Z");
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(input.date) ||
      !Number.isFinite(parsed) ||
      new Date(parsed).toISOString().slice(0, 10) !== input.date ||
      !/^([01]\d|2[0-3]):(00|30)$/.test(input.time) ||
      input.date + "T" + input.time <= localNow ||
      parsed > now + 180 * 86400000
    )
      throw new ConvexError(
        "Choose a future date within the next six months and a time on the hour or half-hour (Eastern Time).",
      );
    const recent = await ctx.db
      .query("reservations")
      .withIndex("by_phone_created", (q) =>
        q.eq("phone", phone).gte("createdAt", now - 86400000),
      )
      .take(3);
    if (recent.length >= 3)
      throw new ConvexError(
        "You’ve already sent several requests. Please call us to update your plans.",
      );
    const globalRecent = await ctx.db
      .query("reservations")
      .withIndex("by_created", (q) => q.gte("createdAt", now - 3600000))
      .take(100);
    if (globalRecent.length >= 100)
      throw new ConvexError(
        "Online requests are busy right now. Please call the restaurant.",
      );
    const reference =
      "FNT-" + input.requestKey.replaceAll("-", "").slice(0, 12).toUpperCase();
    await ctx.db.insert("reservations", {
      ...data,
      requestKey: input.requestKey,
      reference,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
    return { reference };
  },
});
export const list = query({
  args: { token: v.string(), status: reservationStatus },
  handler: async (ctx, { token, status }) => {
    await requireStaff(ctx, token, true);
    return ctx.db
      .query("reservations")
      .withIndex("by_status_date", (q) => q.eq("status", status))
      .order("desc")
      .take(200);
  },
});
export const setStatus = mutation({
  args: {
    token: v.string(),
    id: v.id("reservations"),
    status: reservationStatus,
  },
  handler: async (ctx, { token, id, status }) => {
    await requireStaff(ctx, token, true);
    if (!(await ctx.db.get(id)))
      throw new ConvexError("Reservation no longer exists.");
    await ctx.db.patch(id, { status, updatedAt: Date.now() });
  },
});
