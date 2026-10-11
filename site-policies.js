(() => {
  const key = "fnt-cookie-notice";
  const version = "2026-10-11";
  let acknowledged = false;
  try {
    acknowledged = localStorage.getItem(key) === version;
  } catch {
    // The notice still works when browser storage is unavailable.
  }
  const notice = document.createElement("section");
  notice.className = "cookie-notice";
  notice.setAttribute("role", "region");
  notice.setAttribute("aria-label", "Cookies and privacy");
  notice.hidden = acknowledged;
  notice.innerHTML = `
    <h2>Cookies &amp; your privacy</h2>
    <p>We use essential browser storage to remember your menu picks and this notice. No analytics or advertising cookies are enabled.</p>
    <div class="cookie-notice-actions">
      <a href="privacy.html#cookies">Privacy &amp; cookies</a>
      <button type="button" data-cookie-dismiss>Got it</button>
    </div>`;
  document.body.append(notice);
  let returnFocus;
  const dismiss = notice.querySelector("[data-cookie-dismiss]");
  dismiss.addEventListener("click", () => {
    try {
      localStorage.setItem(key, version);
    } catch {}
    notice.hidden = true;
    if (returnFocus?.isConnected) returnFocus.focus();
    else document.querySelector("[data-cookie-settings]")?.focus({ preventScroll: true });
    returnFocus = null;
  });
  document.querySelectorAll("[data-cookie-settings]").forEach((button) => {
    button.addEventListener("click", () => {
      returnFocus = button;
      notice.hidden = false;
      dismiss.focus({ preventScroll: true });
    });
  });
  window.addEventListener("storage", (event) => {
    if (event.key === key || event.key === null) {
      notice.hidden = event.key === key && event.newValue === version;
    }
  });
})();
