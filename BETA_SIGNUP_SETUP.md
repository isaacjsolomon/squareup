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
