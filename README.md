# Fish N Tingz Bar & Grill

Public HTML/CSS/JavaScript, an independent Vite/React staff portal, and a shared Convex backend at the project root. Modeled on the local JamRoc project without copying its credentials or restaurant data.

## Production

- Website: https://reimage-demo.github.io/fish-n-tingz/
- Staff: https://reimage-demo.github.io/fish-n-tingz-admin/
- Convex: https://adjoining-bat-828.convex.cloud
- Dashboard: https://dashboard.convex.dev/t/re-image-business-solutions/fish-n-tingz/adjoining-bat-828
- Admin access is stored only in the ignored, owner-readable `.local/admin-access.txt` file. No passwords or signing secrets are committed or bundled.

## Two repositories, one project folder

The project root is the `fish-n-tingz` repository: public pages, assets, scripts, tests, and `convex/`. The nested `admin-portal/` is the separate `fish-n-tingz-admin` repository, excluded from the parent repository. Both deploy browser assets from independent `gh-pages` branches. The admin uses named Convex API references and builds independently of the parent.

```text
fisnntingz/
  index.html / menu.html / events.html / contact.html
  styles.css / shared.js / catalog.js / public-config.js
  convex/                 production backend
  assets/                 optimized images and extracted logo
  scripts/ / tests/
  admin-portal/           independent Git repository, Vite + React
  .local/                 ignored private access file
  references/             ignored supplied menu photos and original assets
```

## Develop and publish

Run `npm ci` at root and `npm ci --prefix admin-portal` for the separate admin dependencies.

- `npm run public:build`: bundle vanilla browser JS and copy an allowlist of public files to `dist/`.
- `npm run dev`: preview built public files at http://127.0.0.1:4183.
- `npm run admin:dev`: staff portal at http://127.0.0.1:5183.
- `npm run check`: Convex TypeScript, authorization/content tests, and both production builds.
- `npm run convex:deploy -- --yes`: deploy backend to the project’s production deployment.
- `node scripts/publish-pages.mjs`: publish public `dist/`.
- `node scripts/publish-pages.mjs --admin`: publish `admin-portal/dist/`.

`public-config.js` contains the public production Convex URL. Copy `admin-portal/.env.example` to `.env.production` for independent admin builds. These connection URLs are public identifiers, not secrets. Production admin login is separate from Convex account login.

## What works

The public site subscribes to production Convex for menu, availability, recurring events, hours, and booking/ordering URLs. Its local catalog is a network-failure fallback. The menu includes all 55 entries from the four supplied photographs, including Sunday brunch prices, dinner versus brunch salad add-ons, preparation choices, and tower sizes. The photographed menu takes precedence over older online prices. Steak and eggs has no printed price and is shown as “Ask your server.”

Customers can filter, search, select options, and save a quantity-aware list in their browser. Ordering and payment happen on the restaurant’s existing Toast page. Saved picks are explicitly a reference list and do not transfer into Toast. This project does not fabricate submitted orders or collect card/customer payment data. The staff portal manages menu prices/descriptions/availability/publication, events, and restaurant settings; Toast remains the order management system.

“Book this space” uses Settings → Appispot space booking URL once supplied. Until then it opens a phone enquiry dialog. No Appispot URL, capacity, event dates, or booking confirmation is invented. Sunday brunch and Thursday/Friday happy hour are the verified recurring events.

Admin authorization is enforced server-side. Passwords use salted scrypt plus a server-only pepper. Random sessions are stored only as SHA-256 hashes, expire in 12 hours, and are revoked on logout. Failed login attempts are limited; expired/disabled/employee sessions cannot edit content. Browser tokens use sessionStorage. The initial admin provisioning script refuses to overwrite a local access file or bootstrap an existing account.

## Sources and assets

- Menu and prices: supplied IMG_1953–1956 HEIC photos; converted review copies in `references/`.
- Reviews: supplied October 11, 2026 Google screenshots. Short verbatim excerpts from Nevaeh Hutchins, Natasha, and nikea green, with the supplied 4.3/345 aggregate clearly dated.
- Logo and published food images: https://www.fishntingz.com/ and https://www.fishntingz.com/menu . Original image URL mapping is retained in `references/image-sources.json`.
- Venue: supplied `unnamed-2.jpg`.
- Hours, phone, ordering link: restaurant’s existing website, checked October 11, 2026. Hours: https://www.fishntingz.com/ . Events: https://www.fishntingz.com/eventservices . Brunch 12–6 PM comes from the supplied menu.

The original logo banner was extracted with the built-in imagegen tool, then resized to `assets/brand/logo.webp`. The full PNG is `assets/brand/logo-extracted.png`. Prompt: “Extract just the central stacked FISH N TINGZ brand mark and BAR AND GRILL line as a crisp transparent PNG for a website header. Preserve exactly the original white bold FISH lettering on red rectangular block, small slanted white N on yellow block, white TINGZ on green block beneath, and narrow BAR AND GRILL lettering below. Make BAR AND GRILL lettering dark forest green so it reads on white. Remove all palm trees, sky, background and the bottom tagline. No new elements, no shadows. Faithful extraction, not a redesign.”

No generated food photography is used. Published restaurant images are illustrative of the restaurant’s menu; final presentation and availability are confirmed by the restaurant.
