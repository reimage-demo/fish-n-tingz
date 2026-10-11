import { easternNow, addDays, timeSlots, dateLabel, timeLabel } from "./reservation-time.js";

export function setupReservationForm(form, { submitRequest, getPhone }) {
  const field = (name) => form.elements.namedItem(name);
  const date = field("date"), time = field("time"), party = field("party");
  const status = document.querySelector("#reservation-status");
  const selection = document.querySelector("#reservation-selection");
  const fieldset = document.querySelector("#reservation-fields");
  const button = form.querySelector('[type="submit"]');
  const confirmation = document.querySelector("#reservation-confirmation");
  const shortcuts = [...form.querySelectorAll("[data-date-offset]")];
  let requestKey = crypto.randomUUID();
  let busy = false;

  function feedback(message, state = "error", focus = false) {
    status.textContent = message;
    status.className = state;
    if (focus) status.focus();
  }
  function updateSelection() {
    const current = easternNow();
    shortcuts.forEach((shortcut) => shortcut.setAttribute("aria-pressed", String(date.value === addDays(current.date, Number(shortcut.dataset.dateOffset)))));
    selection.textContent = date.value && date.validity.valid && time.value
      ? `${dateLabel(date.value)} · ${timeLabel(time.value)} Eastern · ${party.value || "—"} ${party.value === "1" ? "guest" : "guests"}`
      : "Choose a date and time for your request.";
  }
  function refreshTimes(preferred = time.value) {
    const current = easternNow();
    date.min = current.date;
    date.max = addDays(current.date, 180);
    const slots = date.validity.valid ? timeSlots(date.value) : [];
    time.replaceChildren(...slots.map((slot) => new Option(slot.label, slot.value)));
    if (!slots.length) {
      time.add(new Option(date.value === current.date ? "No later times today — choose another date" : "Choose a valid date first", ""));
    } else {
      time.value = slots.some((slot) => slot.value === preferred) ? preferred : slots[0].value;
    }
    time.setCustomValidity(slots.length ? "" : "Choose another date to see available request times.");
    updateSelection();
  }
  function defaults() {
    date.value = easternNow().date;
    refreshTimes("");
  }
  defaults();

  shortcuts.forEach((shortcut) => shortcut.addEventListener("click", () => {
    date.value = addDays(easternNow().date, Number(shortcut.dataset.dateOffset));
    date.removeAttribute("aria-invalid");
    refreshTimes();
  }));
  date.addEventListener("change", () => refreshTimes());
  time.addEventListener("change", updateSelection);
  party.addEventListener("input", updateSelection);
  form.addEventListener("invalid", (event) => {
    event.target.setAttribute("aria-invalid", "true");
    feedback("Please check the highlighted fields before sending your request.");
  }, true);
  form.addEventListener("input", (event) => {
    event.target.removeAttribute("aria-invalid");
    if (event.target === field("phone")) event.target.setCustomValidity("");
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy) return;
    const selectedTime = time.value;
    const validTimes = timeSlots(date.value);
    if (!validTimes.some((slot) => slot.value === selectedTime)) {
      refreshTimes();
      feedback("That time is no longer available to request. Review the updated date and time, then send your request again.", "error", true);
      return;
    }
    const phone = field("phone");
    const digits = phone.value.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
    phone.setCustomValidity(/^\d{10,15}$/.test(digits) ? "" : "Enter a phone number with 10 to 15 digits so we can confirm your table.");
    if (!form.reportValidity()) return;
    if (navigator.onLine === false) {
      feedback("You’re offline. Your request has not been sent. Reconnect and try again; your details are still here.", "error", true);
      return;
    }
    const fields = Object.fromEntries(new FormData(form));
    busy = true;
    fieldset.disabled = true;
    form.setAttribute("aria-busy", "true");
    button.textContent = "Sending request…";
    feedback("Sending your request. Please keep this page open.", "sending");
    const slowTimer = setTimeout(() => feedback("This is taking longer than usual. We’re still waiting for a response; please don’t send another request or close this page.", "sending"), 15000);
    try {
      const result = await submitRequest({ ...fields, party: Number(fields.party), requestKey });
      document.querySelector("#confirmation-next").textContent = `Thanks, ${fields.name.trim()}. Our team will call ${fields.phone} to confirm availability.`;
      document.querySelector("#confirmation-when").textContent = `${dateLabel(fields.date)} at ${timeLabel(fields.time)} Eastern`;
      document.querySelector("#confirmation-party").textContent = `${fields.party} ${Number(fields.party) === 1 ? "guest" : "guests"}`;
      document.querySelector("#confirmation-reference").textContent = result.reference;
      form.hidden = true;
      confirmation.hidden = false;
      confirmation.focus();
      requestKey = crypto.randomUUID();
    } catch (error) {
      feedback(typeof error?.data === "string"
        ? error.data
        : `We couldn’t confirm that your request was received. Your details are still here. Try again, or call ${getPhone()} before submitting a different request.`, "error", true);
    } finally {
      clearTimeout(slowTimer);
      busy = false;
      fieldset.disabled = false;
      form.removeAttribute("aria-busy");
      button.textContent = "Request a table";
    }
  });
  document.querySelector("#reservation-new").addEventListener("click", () => {
    form.reset();
    field("phone").setCustomValidity("");
    form.querySelectorAll('[aria-invalid]').forEach((control) => control.removeAttribute("aria-invalid"));
    status.textContent = "";
    confirmation.hidden = true;
    form.hidden = false;
    defaults();
    field("name").focus();
  });
}
