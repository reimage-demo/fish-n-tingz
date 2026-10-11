import {
  menu as initialMenu,
  events as initialEvents,
  settings as initialSettings,
} from "./catalog.js";
import { ConvexClient, anyApi } from "./vendor/convex-browser.js";
export const escapeHTML = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
const money = (n) =>
  n === null
    ? "Ask your server"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2,
        minimumFractionDigits: 0,
      }).format(n);
const safeUrl = (value, fallback = "") => {
  try {
    const u = new URL(value, location.href);
    return u.protocol === "https:" || u.origin === location.origin
      ? u.href
      : fallback;
  } catch {
    return fallback;
  }
};
let client;
let menu = initialMenu,
  events = initialEvents,
  settings = initialSettings,
  kind = "all",
  category = new URLSearchParams(location.search).get("category") || "All",
  search = "";
let picks = [];
try {
  const data = JSON.parse(localStorage.getItem("fnt-picks") || "[]");
  if (Array.isArray(data))
    picks = data
      .filter(
        (x) =>
          typeof x.slug === "string" &&
          typeof x.key === "string" &&
          typeof x.options === "string" &&
          Number.isInteger(x.quantity) &&
          x.quantity > 0 &&
          x.quantity <= 20 &&
          Number.isFinite(x.extra) &&
          x.extra >= 0,
      )
      .slice(0, 60);
} catch {}
function flash(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  clearTimeout(flash.timer);
  flash.timer = setTimeout(() => $("#toast").classList.remove("visible"), 2700);
}
function savePicks() {
  try {
    localStorage.setItem("fnt-picks", JSON.stringify(picks));
  } catch {
    flash("Your browser could not save this list.");
  }
  updateCount();
}
function updateCount() {
  if ($("#picks-count"))
    $("#picks-count").textContent = picks.reduce((n, p) => n + p.quantity, 0);
}
function applySettings() {
  const orderUrl = safeUrl(settings.orderingUrl, "tel:+18607304440");
  $$(".order-link").forEach((a) => {
    a.href = orderUrl;
  });
  $$(".phone-link").forEach((a) => {
    a.href = "tel:" + settings.phone.replace(/[^+\d]/g, "");
    a.textContent = settings.phone;
  });
  $$(".address-link").forEach((a) => {
    a.textContent = settings.address;
    a.href =
      "https://www.google.com/maps/search/?api=1&query=" +
      encodeURIComponent(settings.address);
  });
  $$("[data-hours]").forEach((el) => {
    el.innerHTML = settings.hours
      .split("\n")
      .map((row) => {
        const [day, time] = row.split("|");
        return `<div><span>${escapeHTML(day)}</span><span>${escapeHTML(time)}</span></div>`;
      })
      .join("");
  });
}
function renderFeatured() {
  if (!$("#featured-items")) return;
  $("#featured-items").innerHTML = [
    "oxtail-tacos",
    "red-snapper",
    "jerk-chicken",
  ]
    .map((slug) => menu.find((i) => i.slug === slug))
    .filter(Boolean)
    .map(
      (i) =>
        `<article class="food-card"><a class="food-photo" href="menu.html?item=${encodeURIComponent(i.slug)}"><img src="${escapeHTML(safeUrl(i.image))}" width="1000" height="800" loading="lazy" alt="${escapeHTML(i.name)}"></a><div class="food-info"><div class="food-title"><h3><a href="menu.html?item=${encodeURIComponent(i.slug)}">${escapeHTML(i.name)}</a></h3><strong>${money(i.price)}</strong></div><p>${escapeHTML(i.description)}</p></div></article>`,
    )
    .join("");
}
const drinkCategories = ["Signature drinks", "For the table", "Soft drinks"];
function visibleKind(i) {
  return (
    kind === "all" ||
    (kind === "drinks"
      ? drinkCategories.includes(i.category)
      : !drinkCategories.includes(i.category))
  );
}
const isIllustration = (item) => item.image?.includes("menu-illustration-");
const imageAlt = (item) => `${item.name}${isIllustration(item) ? " — AI-generated illustration" : ""}`;
function renderMenu() {
  if (!$("#menu-content")) return;
  const categories = [
    ...new Set(menu.filter(visibleKind).map((i) => i.category)),
  ];
  if (category !== "All" && !categories.includes(category)) category = "All";
  $("#category-nav").innerHTML = ["All", ...categories]
    .map(
      (c) =>
        `<button data-category="${escapeHTML(c)}" class="${c === category ? "selected" : ""}" aria-pressed="${c === category}">${c === "All" ? "All items" : escapeHTML(c)}</button>`,
    )
    .join("");
  const filtered = menu.filter(
    (i) =>
      visibleKind(i) &&
      (category === "All" || i.category === category) &&
      `${i.name} ${i.description}`.toLowerCase().includes(search),
  );
  $("#menu-content").innerHTML =
    categories
      .map((c) => {
        const items = filtered.filter((i) => i.category === c);
        if (!items.length) return "";
        return `<section class="menu-section"><h2>${escapeHTML(c)}</h2><div class="menu-grid">${items.map((i) => `<article class="menu-item">${i.image ? `<figure class="menu-visual"><button class="menu-photo" data-item="${escapeHTML(i.slug)}" aria-label="View ${escapeHTML(i.name)}"><img src="${escapeHTML(safeUrl(i.image))}" width="720" height="540" alt="${escapeHTML(imageAlt(i))}" loading="lazy" decoding="async"></button>${isIllustration(i) ? '<figcaption>AI-generated illustration</figcaption>' : ''}</figure>` : ''}<div class="menu-item-copy"><h3>${escapeHTML(i.name)}</h3><p>${escapeHTML(i.description)}</p><div class="menu-item-action"><strong>${money(i.price)}</strong><button class="menu-details" data-item="${escapeHTML(i.slug)}" aria-label="View ${escapeHTML(i.name)} details">View item</button></div>${!i.available ? "<p>Currently unavailable</p>" : ""}</div></article>`).join("")}</div></section>`;
      })
      .join("") ||
    '<div class="empty"><h2>No matches this time.</h2><p>Try another dish, ingredient, or category.</p><button class="button" id="clear-filters">Show the full menu</button></div>';
}
function itemDialog(slug) {
  const i = menu.find((x) => x.slug === slug);
  if (!i || !$("#item-dialog")) return;
  $("#item-detail").innerHTML =
    `${i.image ? `<img class="detail-image" src="${escapeHTML(safeUrl(i.image))}" alt="${escapeHTML(imageAlt(i))}">${isIllustration(i) ? '<p class="image-caption">AI-generated illustration. Actual presentation may vary.</p>' : ""}` : ""}<h2 id="item-title">${escapeHTML(i.name)}</h2><p class="small">${escapeHTML(i.description)}</p><div class="detail-price">${money(i.price)}</div><form id="item-form">${i.options.map((o, n) => `<label class="option-label">${escapeHTML(o.name)}<select name="option-${n}">${o.choices.map((c, j) => `<option value="${j}">${escapeHTML(c.label)}${c.extra ? " +" + money(c.extra) : ""}</option>`).join("")}</select></label>`).join("")}<div class="detail-actions"><label><span class="sr-only">Quantity</span><input class="quantity" name="quantity" type="number" min="1" max="20" value="1" required></label><button class="button" ${!i.available || i.price === null ? "disabled" : ""}>${!i.available ? "Currently unavailable" : i.price === null ? "Ask your server" : "Add to your picks"}</button></div></form><a class="text-link" href="${escapeHTML(safeUrl(settings.orderingUrl, "tel:+18607304440"))}" target="_blank" rel="noopener">Order on Toast </a>${drinkCategories.includes(i.category) ? '<p class="small">Alcohol availability is confirmed by the restaurant. Towers may require dine-in service.</p>' : ""}`;
  $("#item-form").onsubmit = (e) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget),
      selected = i.options.map(
        (o, n) => o.choices[Number(data.get("option-" + n))],
      );
    const quantity = Math.max(
        1,
        Math.min(20, Number(data.get("quantity")) || 1),
      ),
      options = selected.map((c) => c.label).join(" · "),
      extra = selected.reduce((n, c) => n + c.extra, 0),
      key = i.slug + ":" + selected.map((c) => c.label).join("|");
    const existing = picks.find((p) => p.key === key);
    if (existing)
      existing.quantity = Math.min(20, existing.quantity + quantity);
    else picks.push({ key, slug: i.slug, options, extra, quantity });
    savePicks();
    $("#item-dialog").close();
    flash(i.name + " added to your picks");
  };
  $("#item-form").onchange = () => {
    const data = new FormData($("#item-form"));
    const extra = i.options.reduce(
      (sum, o, n) => sum + o.choices[Number(data.get("option-" + n))].extra,
      0,
    );
    $(".detail-price").textContent = money(
      i.price === null ? null : i.price + extra,
    );
  };
  $("#item-dialog").showModal();
}
function renderPicks() {
  const entries = picks.map((p) => ({
    ...p,
    item: menu.find((i) => i.slug === p.slug),
  }));
  $("#picks-items").innerHTML =
    entries
      .map(
        (p) =>
          `<div class="pick-row"><div><h3>${escapeHTML(p.item?.name || "Item no longer on the menu")}</h3><p>${escapeHTML(p.options)}</p>${!p.item?.available ? "<p>Unavailable — remove before ordering.</p>" : ""}<div class="pick-controls"><button data-pick="${escapeHTML(p.key)}" data-delta="-1" aria-label="Remove one ${escapeHTML(p.item?.name || "item")}">−</button><span>${p.quantity}</span><button data-pick="${escapeHTML(p.key)}" data-delta="1" aria-label="Add one ${escapeHTML(p.item?.name || "item")}">+</button><button data-pick="${escapeHTML(p.key)}" data-delta="0" aria-label="Remove ${escapeHTML(p.item?.name || "item")}">Remove</button></div></div><span>${p.item?.price != null ? money((p.item.price + p.extra) * p.quantity) : "—"}</span></div>`,
      )
      .join("") ||
    '<p class="empty">Your table is still empty. Add something good from the menu.</p>';
  $("#picks-summary").innerHTML = entries.length
    ? `<span>Estimated subtotal</span><span>${money(entries.reduce((n, p) => n + ((p.item?.price || 0) + p.extra) * p.quantity, 0))}</span>`
    : "";
}
function renderEvents() {
  if (!$("#event-list")) return;
  $("#event-list").innerHTML = events.length
    ? events
        .map(
          (e) =>
            `<article class="event-row"><img src="${escapeHTML(safeUrl(e.image, "assets/images/our-space.webp"))}" width="240" height="180" loading="lazy" alt="${escapeHTML(e.title)}"><div><p class="eyebrow">${escapeHTML(e.schedule)}</p><h3>${escapeHTML(e.title)}</h3><p>${escapeHTML(e.description)}</p></div><a class="text-link" href="menu.html?category=${e.title.toLowerCase().includes("sunday") ? "Sunday%20brunch" : "Signature%20drinks"}">Explore the menu </a></article>`,
        )
        .join("")
    : "<p>We’re planning the next good time. Follow us on Instagram for updates, or call to plan your own gathering.</p>";
}
$(".nav-toggle").onclick = () => {
  const open = $(".site-header").classList.toggle("nav-open");
  $(".nav-toggle").setAttribute("aria-expanded", String(open));
};
$$("[data-nav]")
  .find((a) => a.dataset.nav === document.body.dataset.page)
  ?.setAttribute("aria-current", "page");
$("#year").textContent = new Date().getFullYear();
document.addEventListener("click", (e) => {
  const close = e.target.closest(".dialog-close");
  if (close) close.closest("dialog").close();
  const book = e.target.closest(".book-space");
  if (book) {
    const url = safeUrl(settings.bookingUrl);
    if (settings.bookingUrl && url) location.href = url;
    else $("#booking-dialog").showModal();
  }
  const categoryButton = e.target.closest("[data-category]");
  if (categoryButton) {
    category = categoryButton.dataset.category;
    renderMenu();
  }
  const kindButton = e.target.closest("[data-kind]");
  if (kindButton) {
    kind = kindButton.dataset.kind;
    category = "All";
    $$("[data-kind]").forEach((b) => {
      b.classList.toggle("selected", b === kindButton);
      b.setAttribute("aria-pressed", String(b === kindButton));
    });
    renderMenu();
  }
  const item = e.target.closest("[data-item]");
  if (item) itemDialog(item.dataset.item);
  if (e.target.closest("#open-picks")) {
    renderPicks();
    $("#picks-dialog").showModal();
  }
  const pick = e.target.closest("[data-pick]");
  if (pick) {
    const p = picks.find((x) => x.key === pick.dataset.pick),
      delta = Number(pick.dataset.delta);
    if (p) {
      p.quantity = delta ? Math.min(20, p.quantity + delta) : 0;
      picks = picks.filter((x) => x.quantity > 0);
      savePicks();
      renderPicks();
    }
  }
  if (e.target.closest("#clear-filters")) {
    kind = "all";
    category = "All";
    search = "";
    $("#menu-search").value = "";
    $$("[data-kind]").forEach((b) => {
      b.classList.toggle("selected", b.dataset.kind === "all");
      b.setAttribute("aria-pressed", String(b.dataset.kind === "all"));
    });
    renderMenu();
  }
});
$("#menu-search")?.addEventListener("input", (e) => {
  search = e.target.value.trim().toLowerCase();
  renderMenu();
});
applySettings();
renderFeatured();
renderMenu();
renderEvents();
updateCount();
const requestedItem = new URLSearchParams(location.search).get("item");
if (requestedItem) itemDialog(requestedItem);
if (window.FNT_CONFIG?.convexUrl) {
  client = new ConvexClient(window.FNT_CONFIG.convexUrl);
  client.onUpdate(
    anyApi.content.publicContent,
    {},
    (content) => {
      menu = content.menu.map((item) => ({
        ...item,
        image: item.image || initialMenu.find((original) => original.slug === item.slug)?.image || "",
      }));
      events = content.events;
      if (content.settings) settings = content.settings;
      applySettings();
      renderFeatured();
      renderMenu();
      renderEvents();
      if ($("#picks-dialog")?.open) renderPicks();
    },
    (error) =>
      console.warn(
        "Live menu temporarily unavailable; showing the published menu.",
      ),
  );
}

const reservationForm = $("#reservation-form");
if (reservationForm) {
  const easternDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  reservationForm.elements.date.min = easternDate;
  let requestKey = crypto.randomUUID();
  let busy = false;
  reservationForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy) return;
    const status = $("#reservation-status"),
      button = reservationForm.querySelector('button[type="submit"]');
    const fields = Object.fromEntries(new FormData(reservationForm));
    busy = true;
    button.disabled = true;
    button.textContent = "Sending request…";
    status.textContent = "";
    try {
      if (!client)
        throw new Error(
          "Reservations are temporarily unavailable. Please call us.",
        );
      const result = await client.mutation(anyApi.reservations.request, {
        ...fields,
        party: Number(fields.party),
        requestKey,
      });
      status.textContent = `Request received. Reference ${result.reference}. Your table is pending confirmation; our team will contact you by phone. To change your request, call ${settings.phone}.`;
      status.className = "success";
      reservationForm.reset();
      requestKey = crypto.randomUUID();
    } catch (error) {
      status.className = "error";
      status.textContent =
        typeof error.data === "string"
          ? error.data
          : "We couldn’t send your request. Please try again, or call " +
            settings.phone +
            ".";
    } finally {
      busy = false;
      button.disabled = false;
      button.textContent = "Request a table";
      status.focus();
    }
  });
}
