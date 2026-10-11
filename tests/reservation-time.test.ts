import { expect, test } from "vitest";
import { easternNow, addDays, timeSlots } from "../reservation-time.js";

test("defaults use the restaurant's date, even when UTC is already tomorrow", () => {
  const now = new Date("2026-10-12T02:17:00Z");
  expect(easternNow(now)).toEqual({ date: "2026-10-11", minute: 22 * 60 + 17 });
  expect(timeSlots("2026-10-11", now)[0]).toEqual({ value: "22:30", label: "10:30 PM" });
});
test("today excludes passed times and the current half-hour", () => {
  const slots = timeSlots("2026-10-11", new Date("2026-10-11T18:30:00Z"));
  expect(slots[0].value).toBe("15:00");
  expect(slots.every((slot) => /:(00|30)$/.test(slot.value))).toBe(true);
});
test("late night keeps today empty and lets the guest choose tomorrow", () => {
  const now = new Date("2026-10-12T03:45:00Z");
  expect(timeSlots("2026-10-11", now)).toEqual([]);
  expect(timeSlots("2026-10-12", now)).toHaveLength(48);
  expect(timeSlots("2026-10-10", now)).toEqual([]);
  expect(timeSlots("", now)).toEqual([]);
});
test("Eastern daylight-saving changes and calendar arithmetic stay correct", () => {
  expect(easternNow(new Date("2026-03-08T06:45:00Z")).minute).toBe(105);
  expect(easternNow(new Date("2026-03-08T07:15:00Z")).minute).toBe(195);
  expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  expect(addDays("2026-03-07", 1)).toBe("2026-03-08");
});
