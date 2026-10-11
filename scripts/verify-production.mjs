import { readFile } from "node:fs/promises";
import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
const client = new ConvexHttpClient("https://adjoining-bat-828.convex.cloud");
const text = await readFile(".local/admin-access.txt", "utf8");
const username = text.match(/Username: (.+)/)[1],
  password = text.match(/Password: (.+)/)[1];
const session = await client.action(anyApi.accounts.login, {
  username,
  password,
});
if (!session.token) throw Error("Production login failed");
try {
  const dashboard = await client.query(anyApi.content.dashboard, {
    token: session.token,
  });
  if (dashboard.menu.length !== 55) throw Error("Menu seed mismatch");
  const publicContent = await client.query(anyApi.content.publicContent, {});
  if (publicContent.menu.length !== 55) throw Error("Public menu mismatch");
  console.log(
    "Production sign-in, authorized dashboard, and 55-item public menu verified.",
  );
} finally {
  await client.mutation(anyApi.auth.logout, { token: session.token });
}
const loggedOut = await client.query(anyApi.auth.me, { token: session.token });
if (loggedOut !== null) throw Error('Session remained active after logout');
console.log('Revoked session verified.');
