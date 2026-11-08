# DoWeo Beta Feedback Center

This PR adds an in-app, responsive feedback dialog for signed-in users on desktop and mobile.

## User experience
- Floating **Beta Feedback** button on signed-in screens.
- Choose **Bug report**, **Feature idea**, or **Rate DoWeo**.
- Ratings require a 1–5 star selection.
- Subject and description required, with inline success/error messages.
- Accessible dialog close button, Escape key, focus management, and mobile-safe positioning.

## Backend
- `POST /api/beta-feedback` verifies the signed-in user's bearer token through Supabase Auth.
- Validates feedback type, title, details, rating, and path.
- Associates submissions with the authenticated user ID on the server.
- Limits submissions to 5 per account per rolling 24 hours.
- Does not expose a public feedback listing or user information.

## Required BEFORE merge / deploy
1. Review and run `supabase/migrations/20261107_doweo_beta_feedback.sql` against the **correct production Supabase project**. This creates a new table only; it does not change existing expenses or profiles. Back up and review schema permissions first.
2. Confirm Cloudflare Pages Functions route priority: `/api/beta-feedback` must route to the specific function rather than the catch-all `/api/[[path]]`.
3. Confirm existing `initEvents` initialization runs on authenticated page startup and the API client accepts `api('beta-feedback','POST',payload)`.
4. Deploy via the existing GitHub Actions workflow after merging; it copies `beta-feedback.js` into Pages output.
5. Smoke-test in mobile Safari and desktop Chrome. Verify feedback rows appear in Supabase and cannot be accessed from unrelated accounts.
6. Verify UI does not obscure the mobile navigation bar on the target device.

## Manual test cases
- Signed out: no launcher.
- Signed in: launcher visible, opens dialog, Escape and close restore focus.
- Bug and idea: no rating needed.
- Rating: cannot submit without a star, then submits successfully with 1–5 stars.
- Empty/too-short subject or details: blocked.
- Invalid bearer token: HTTP 401.
- Sixth submission within 24 hours: HTTP 429.
- GET endpoint: HTTP 405.
- Different-origin POST: HTTP 403.
- Missing database table: graceful 503 (no false success).
- Confirm no financial records, password values, or API secrets are included in feedback.

## Triage
Use the Supabase Table Editor to review rows. Do not expose the table directly to browser users. Future improvements can add an admin-only moderation view and status updates.

**This PR does not change the live app until merged and deployed.**
