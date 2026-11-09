# DoWeo Beta Signup — Release Checklist

The beta signup page lives at `/beta/` and submits to `POST /api/beta-signup`.
This is separate from the existing authenticated in-app Beta Feedback Center.

## Before merging
1. Apply and verify `supabase/migrations/20261109_doweo_beta_signup.sql` on the **production** project (`pajrdqarszbnrlstoyly`), after reviewing the additive migration. It does not change expense/tracker/profile records.
2. Confirm `SUPABASE_SERVICE_ROLE_KEY` exists only as a Cloudflare Pages encrypted **server** secret. Never expose it in HTML or repository files.
3. Add Cloudflare WAF rate limiting and bot protection to `POST /api/beta-signup`. The endpoint validates input, checks Origin, has an invisible honeypot, and deduplicates email; these are not substitutes for robust abuse prevention. Prefer enabling Cloudflare Turnstile server verification before advertising publicly. If you enable `TURNSTILE_SECRET_KEY`, you **must first wire a valid Turnstile widget/token into the frontend** or all signups will fail.
4. Make a test application; verify a `pending` row in Supabase Table Editor and check that personal data is not available through unauthenticated Supabase REST requests.
5. Repeat an application with the same email and confirm there is only one record; test invalid email, empty consent, wrong-origin POST, oversize payload, mobile Safari, and desktop Chrome.
6. Review applications in the private Supabase Table Editor; set status to `approved`, `rejected`, or `waitlisted`. Contact approved testers manually. Automated approval emails and an admin portal are **not** part of this PR.
7. Test the existing Beta Feedback Center and `help.doweo@gmail.com` email flow independently before inviting testers.

## Public communications
Do not publish a poster QR code until the actual signup page is deployed and its QR code is generated from the verified live URL. 
Use `https://doweo.pages.dev/beta/` only after verifying production. No special beta app is required.

## Privacy
Applications contain name, email, device, optional note, and use case. The table enables RLS and revokes anonymous/authenticated client grants; only the server's service role and authorized database admins may access application records. Do not copy applicants into public GitHub issues.

## Beta application notification emails
New beta applications now trigger an email to **help.doweo@gmail.com**, from the Cloudflare Pages server. Applicants' information is also saved in the private Supabase table even if email delivery fails. Duplicate applications do not send repeated emails.

Cloudflare Pages production runtime must have BOTH encrypted server-side configuration values:
- `RESEND_API_KEY` — the Resend API key
- `BETA_FEEDBACK_FROM_EMAIL` — a sender address or sender display-name/address pair verified with Resend

These are the same variables used by the existing beta-feedback endpoint. Never embed them in client HTML or JavaScript. The `GET /api/beta-signup` readiness response now also exposes a non-sensitive boolean `email_ready`. This boolean confirms variables exist, **not** that delivery succeeds.

If email cannot be delivered, signup still saves and the user sees a clearly worded warning. Review the `doweo_beta_applications` table to recover applications; email failures are visible in Cloudflare function logs. Email status is not persisted in the current application table.

### Verify before announcing
1. After deployment, call `GET /api/beta-signup` and confirm `email_ready:true`.
2. Submit **one** real test application with an email address under your control and consent.
3. Verify its row is in Supabase and a new application email arrives at help.doweo@gmail.com (also check spam).
4. Re-submit the same email, confirm no duplicate row or new notification.
5. If email is not received, inspect Cloudflare Pages Functions logs and Resend sender verification; correct the production environment settings before promoting signups.

