# DoWeo Cloudflare + Supabase migration (test version)

This is a **test build** of the existing DoWeo interface. Netlify Identity has been replaced with Supabase Auth. A Cloudflare Pages Function provides compatible `/api/*` routes using Supabase database and private Storage buckets.

**Not a one-click drag-and-drop upload.** Cloudflare Pages drag-and-drop does not compile/deploy the `functions/` folder. Deploy through **Cloudflare Pages Git integration** (recommended), or use Wrangler Pages Functions build/deploy. Do not drag this ZIP onto the Pages upload screen and expect the API to work.

## Setup

1. Make a **private** GitHub repository with the contents of this ZIP at the repository root (not the ZIP itself). In Cloudflare Pages, connect that repository through **Import existing Git repository**. Framework preset: None; build command: leave empty; output directory: `.` (repository root). Cloudflare Pages should detect `functions/api/[[path]].js`.
2. In Cloudflare Pages > Settings > Variables and Secrets, create an **encrypted secret** named `SUPABASE_SERVICE_ROLE_KEY`, containing your Supabase **service_role** key. **Never paste this key into chat, a Git repository, or a frontend file.** Cloudflare functions need this key because your database RLS is enabled and the backend enforces authorization for each route. Use a dedicated test project where possible.
3. In Supabase > Storage, create **private** buckets named `profile-photos` and `tracker-backdrops`. Don't create public buckets.
4. In Supabase > Authentication > URL Configuration, use `https://square-up-with.pages.dev` as Site URL and allow `https://square-up-with.pages.dev/**` for redirects. If the Pages deployment uses a different domain, update these URLs.
5. Supabase > Authentication > Sign In / Providers: email enabled. If Google OAuth isn't configured, the Google button won't work until configured; optionally hide it.
6. Deploy. Test a **new test account** first. Check login, create tracker, entry, invite, photo uploads, and permission boundaries. Do not switch users from Netlify yet.

## Existing users and data (not migrated automatically)

Your four CSV exports were **not** included in this ZIP, to avoid publishing private data. Do not upload CSVs to the Pages site or GitHub.

Netlify Identity IDs and Supabase Auth IDs are different. Before importing the four CSVs, create an explicit old-ID -> new-ID mapping for *both* users, then replace all `profiles.user_id`, `trackers.owner_id`, `tracker_members.user_id`, and `tracker_entries.created_by` references consistently. Retain `tracker_id` and entry IDs. Import order: trackers, tracker_members, tracker_entries, profiles, subject to validation and constraints. Image binary data from Netlify Blobs must be exported separately; the CSV `photo_key` and `backdrop_image` values are only pointers and do not transfer the image bytes. Do not mark the migration complete until the old photos have been transferred and verified.

## Security / test limitations

- This is a first-pass conversion, **not production-audited**. Test all operations and sharing permissions before launch. The API checks Supabase JWTs on each request and checks tracker membership for access.
- Supabase `service_role` bypasses RLS: keep the key exclusively in Cloudflare encrypted secrets. The server-side code, not RLS, is the authorization boundary for these API routes.
- Database RLS can remain enabled. No browser code needs `service_role`.
- Cloudflare Pages Git deploy (not dashboard drag-and-drop) is necessary to include functions.
- The existing Netlify website and database remain untouched.
